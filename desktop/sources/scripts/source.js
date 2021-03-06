'use strict'

function Source (terminal) {
  const fs = require('fs')
  const path = require('path')
  const { dialog, app } = require('electron').remote

  this.path = null

  this.start = function () {
    this.new()
  }

  this.new = function () {
    console.log('Source', 'Make a new file..')
    this.path = null
    terminal.orca.reset()
    terminal.resize()
    terminal.history.reset()
    terminal.cursor.reset()
    terminal.clock.play()
  }

  this.open = function () {
    console.log('Source', 'Open a file..')
    let paths = dialog.showOpenDialog(app.win, { properties: ['openFile'], filters: [{ name: 'Orca Machines', extensions: ['orca'] }] })
    if (!paths) { console.log('Nothing to load'); return }
    this.read(paths[0])
  }

  this.save = function (quitAfter = false) {
    console.log('Source', 'Save a file..')
    if (this.path) {
      this.write(this.path, this.generate(), quitAfter)
    } else {
      this.saveAs(quitAfter)
    }
  }

  this.saveAs = function (quitAfter = false) {
    console.log('Source', 'Save a file as..')
    dialog.showSaveDialog((path) => {
      if (path === undefined) { return }
      if (path.indexOf('.orca') < 0) { path += '.orca' }
      this.write(path, this.generate(), quitAfter)
      this.path = path
    })
  }

  this.revert = function () {
    if (!this.path) { return }
    console.log('Source', 'Revert a file..')
    this.read(this.path)
  }

  // I/O

  this.write = function (path, data = this.generate(), quitAfter = false) {
    console.log('Source', 'Writing ' + path)
    fs.writeFileSync(path, data)
    terminal.source.remember('active', path)
    if (quitAfter === true) {
      app.exit()
    }
  }

  this.read = function (path = this.path) {
    if (!path) { return }
    if (!fs.existsSync(path)) { console.warn('Source', 'File does not exist: ' + path); return }
    console.log('Source', 'Reading ' + path)
    this.path = path
    this.remember('active', path)

    //
    const data = fs.readFileSync(path, 'utf8')
    const lines = data.split('\n').map((line) => { return clean(line) })
    const w = lines[0].length
    const h = lines.length
    const s = lines.join('\n').trim()

    terminal.orca.load(w, h, s)
    terminal.history.reset()
    terminal.history.record(terminal.orca.s)
    terminal.updateSize()
  }

  this.quit = function () {
    if (this.hasChanges() === true) {
      this.verify()
    } else {
      app.exit()
    }
  }

  this.verify = function () {
    let response = dialog.showMessageBox(app.win, {
      type: 'question',
      buttons: ['Cancel', 'Discard', 'Save'],
      title: 'Confirm',
      message: 'Unsaved data will be lost. Would you like to save your changes before leaving?',
      icon: path.join(__dirname, '../../icon.png')
    })
    if (response === 2) {
      this.save(true)
    } else if (response === 1) {
      app.exit()
    }
  }

  this.hasChanges = function () {
    console.log('Source', 'Looking for changes..')
    if (!this.path) {
      console.log('Source', 'File is unsaved..')
      if (terminal.orca.length() > 2) {
        console.log('Source', `File is not empty.`)
        return true
      }
    } else {
      if (fs.existsSync(this.path)) {
        console.log('Source', 'Comparing with last saved copy..')
        const diff = isDifferent(fs.readFileSync(this.path, 'utf8'), this.generate())
        if (diff === true) {
          console.log('Source', 'File has been changed.')
          return true
        }
      } else {
        console.log('Source', 'File does not exist.')
        return true
      }
    }
  }

  // LocalStorage

  this.resume = function () {
    const path = this.recall('active')
    if (path) {
      this.read(path)
    }
  }

  this.remember = function (key, val) {
    if (!key || !val) { return }
    console.log('Source', `Remember: ${key}=${val}`)
    localStorage.setItem(key, val)
  }

  this.recall = function (key) {
    if (!key) { return }
    if (localStorage.hasOwnProperty(key)) {
      console.log('Source', `Recall: ${key}`)
      return localStorage.getItem(key)
    }
  }

  this.forget = function (key) {
    if (!key) { return }
    console.log('Source', `Forget: ${key}`)
    localStorage.removeItem(key)
  }

  // Converters

  this.generate = function (orca = terminal.orca) {
    return `${orca}`
  }

  this.parse = function (text) {
    const lines = text.split('\n').map((line) => { return clean(line) })
    const w = lines[0].length
    const h = lines.length
    const s = lines.join('\n').trim()
    return terminal.orca.load(w, h, s)
  }

  // Etc

  this.name = function (path = this.path) {
    return path ? path.substr(path.lastIndexOf('/') + 1).replace('.orca', '').trim() : null
  }

  this.folder = function (path = this.path) {
    return path ? path.substring(0, path.lastIndexOf('/')).trim() : null
  }

  this.toString = function () {
    return this.path ? this.name() : 'blank'
  }

  function isDifferent (a, b) {
    return a.replace(/[^a-zA-Z0-9+]+/gi, '').trim() !== b.replace(/[^a-zA-Z0-9+]+/gi, '').trim()
  }

  function clean (s) {
    let c = ''
    for (let x = 0; x <= s.length; x++) {
      const char = s.charAt(x)
      c += !terminal.orca.isAllowed(char) ? '.' : char
    }
    return c
  }
}

module.exports = Source
