const express = require('express');
const fetch = require("node-fetch");
var cors = require('cors');
var moment = require('moment');
var archiver = require('archiver');
var async    = require('async');
var request  = require('request');
const fs = require('fs');
const phantom = require('phantom');

var bodyParser = require( 'body-parser' )

const PORT = process.env.PORT || 5000

const app = express();

app.use(express.static('public'))


app.get('/google_photos', async (req, res) => {
  var photos_arr = []; 
  

  function zipURLs(urls) {

    var urls_arr = urls.filter(function(a){return a !== ''})

    console.log('format urls' + urls_arr)
    
    var zipArchive = archiver.create('zip');

    async.eachLimit(urls_arr, 3, function(url, done) {
      var stream = request.get(url);

      stream.on('error', function(err) {
        return done(err);
      }).on('end', function() {
        return done();
      });

      res.attachment('output.zip'); 
      zipArchive.pipe(res);
      // Use the last part of the URL as a filename within the ZIP archive.
      zipArchive.append(stream, { name : url.replace(/^.*\//, '') + '.jpg' });
    })

    zipArchive.finalize();
  }

  (async () => {
    var album_url = req.query.url;

    // Instantiate PhantomJS page
    const instance = await phantom.create();
    const page     = await instance.createPage();
    await page.property('viewportSize', { width: 1024, height: 100000 });

    // Save requested URLs
    let requestedUrls = [];
    await page.on('onResourceRequested', requestData => {
      requestedUrls.push(requestData.url);
    });

    // Open Google Photos album
    await page.open(album_url);
    await page.property('content');

    // Filter URLs to include only photos
    const photos = requestedUrls
      .filter(requestedUrl => {
        return requestedUrl.includes('https://lh3.');
      })
      .map(photo => {
        const end = photo.lastIndexOf('=w');
        return photo.substring(0, end);
      });

    photos.forEach((photo, index) => {
      photos_arr.push(photo)
    });


  console.log(photos_arr)


  zipURLs(photos_arr);
  })();
})


app.listen(process.env.PORT || 5000, () => console.log(`Server is running at ${PORT}`));