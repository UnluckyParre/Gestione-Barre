const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800
  })

  win.loadURL('http://localhost:5173') // Vite dev server
}

app.whenReady().then(createWindow)