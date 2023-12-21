// const electron = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const _ = require('lodash');

let mainWindow;

app.on('ready', () => {
  // mainWindow = new BrowserWindow({
  //   height: 600,
  //   width: 800,
  //   webPreferences: { backgroundThrottling: false }
  // });
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: `${__dirname}/preload.js`,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/src/index.html`);
  mainWindow.on('closed', () => app.quit());

});

ipcMain.on('videos:added', (event, videos) => {
  // console.log(videos);
//   const promise = new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(videos[0].path, (err, metadata) => {
//       // console.log(metadata);
//       resolve(metadata);
//     })
//   })

//   promise.then((metadata) => { console.log(metadata); });

  const promises = _.map(videos, video => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(video.path, (err, metadata) => {
        // resolve({ 
        //   ...video, 
        //   duration: metadata.format.duration,
        //   format: 'avi'
        // });
        video.duration = metadata.format.duration;
        video.format = 'avi';
        resolve(video);
      });
    });
  });

  Promise.all(promises)
    .then((results) => {
      mainWindow.webContents.send('metadata:complete', results);
    });
});

ipcMain.on('conversion:start', (event, videos) => {
  // const video = videos[0];

  _.each(videos, video => {
    const outputDirectory = video.path.split(video.name)[0];
    const outputName = video.name.split('.')[0];
    const outputPath = `${outputDirectory}${outputName}.${video.format}`;
    // console.log(outputDirectory, outputName, outputPath);
    ffmpeg(video.path)
      .output(outputPath)
      .on('progress', ({ timemark }) => 
        // console.log(event)
        mainWindow.webContents.send('conversion:progree', { video, timemark })
      )
      .on('end', () => 
        mainWindow.webContents.send('conversion:end', { video, outputPath })
      )
      .run();
  });

});

ipcMain.on('folder:open', (event, outputPath) => {
  shell.showItemInFolder(outputPath);
});