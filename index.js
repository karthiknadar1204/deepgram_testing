// const express = require('express');
// const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
// const fetch = require("cross-fetch");

// const app = express();

// app.get('/', (req, res) => {
//   res.send('Hello World');
// });

// app.listen(3000, () => {
//   console.log('Server is running on port 3001');
// });

// const live = async () => {

//   const deepgramApiKey = "a6735dcd53b5459aa253b4a6632987688b48f51a";


//   const url = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";


//   const deepgram = createClient(deepgramApiKey);


//   const connection = deepgram.listen.live({
//     smart_format: true,
//     model: 'nova-2',
//     language: 'en-US',
//   });


//   connection.on(LiveTranscriptionEvents.Open, () => {

//     connection.on(LiveTranscriptionEvents.Transcript, (data) => {
//       console.dir(data, { depth: null });
//     });


//     connection.on(LiveTranscriptionEvents.Metadata, (data) => {
//       console.dir(data, { depth: null });
//     });


//     connection.on(LiveTranscriptionEvents.Close, () => {
//       console.log("Connection closed.");
//     });


//     fetch(url)
//       .then((r) => r.body)
//       .then((res) => {
//         res.on("readable", () => {
//           connection.send(res.read());
//         });
//       });
//   });
// };

// live();

const express = require('express');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const recorder = require('node-record-lpcm16');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Real-time Speech Transcription');
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const io = require('socket.io')(server);

const live = async () => {
  const deepgramApiKey = 'a6735dcd53b5459aa253b4a6632987688b48f51a';

  if (!deepgramApiKey) {
    console.error('Deepgram API key is not set. Please set DEEPGRAM_API_KEY in your .env file.');
    process.exit(1);
  }

  const deepgram = createClient(deepgramApiKey);

  const connection = deepgram.listen.live({
    smart_format: true,
    model: 'nova-2',
    language: 'en-US',
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('Connection opened.');

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      if (transcript) {
        console.log('Transcript:', transcript);
        io.emit('transcript', transcript);
      }
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Connection closed.");
    });

    const stream = recorder.record({
      sampleRate: 16000,
      channels: 1,
      audioType: 'raw',
      threshold: 0,
      verbose: true,
      recordProgram: 'sox',
      silence: '1.0',
    }).stream();

    stream.on('data', (chunk) => {
      if (connection.getReadyState() === 1) {
        connection.send(chunk);
      }
    });

    stream.on('error', (err) => {
      console.error('Recording error:', err);
      console.error('Error details:', err.stack);
      stream.destroy();
      setTimeout(() => {
        console.log('Attempting to restart the recording...');
        stream.resume();
      }, 5000);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      stream.destroy();
    });
  });
};

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

live().catch(error => {
  console.error('Error in live function:', error);
});

process.env.DEBUG = 'record';