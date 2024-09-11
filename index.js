const express = require('express');
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const fetch = require("cross-fetch");

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(3000, () => {
  console.log('Server is running on port 3001');
});

const live = async () => {

  const deepgramApiKey = "a6735dcd53b5459aa253b4a6632987688b48f51a";


  const url = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";


  const deepgram = createClient(deepgramApiKey);


  const connection = deepgram.listen.live({
    smart_format: true,
    model: 'nova-2',
    language: 'en-US',
  });


  connection.on(LiveTranscriptionEvents.Open, () => {

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      console.dir(data, { depth: null });
    });


    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.dir(data, { depth: null });
    });


    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Connection closed.");
    });


    fetch(url)
      .then((r) => r.body)
      .then((res) => {
        res.on("readable", () => {
          connection.send(res.read());
        });
      });
  });
};

live();