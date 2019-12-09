/* eslint-disable no-console */
const { url = "http://192.168.1.231:8080", workingDirectory = __dirname, _ } = require("simple-argv")
const fetch = require("node-fetch")
const { ensureDirSync, removeSync, readdirSync, readFileSync, writeFileSync } = require("fs-extra")
const { join, parse } = require("path")
const inputDirectory = join(workingDirectory, "input")
const outputDirectory = join(workingDirectory, "output")

const auth = name => fetch(`${url}/accreditamento`, {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({ nome: name })
})
  .then(res => res.text())
  .then(console.log)
  .catch(console.error)

const listEx = () => fetch(`${url}/esercizi`)
  .then(res => res.json())

const getInput = ex => fetch(`${url}/esercizi/${ex}`, {
  headers: {
    "x-data": "true"
  }
})
  .then(res => res.json())
  .then(({ data }) => data)

const getInputs = async () => {
  const ex = await listEx()
  return Promise.all(ex.map((_, i) => getInput(i + 1)))
}

const sendOutput = (data, ex) => fetch(`${url}/esercizi/${ex}`, {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({ data })
})
  .then(res => res.json())
  .then(console.log)
  .catch(console.error)

const setupFolder = () => {
  ensureDirSync(workingDirectory)
  removeSync(inputDirectory)
  ensureDirSync(inputDirectory)
  ensureDirSync(outputDirectory)
}

const init = async () => {
  setupFolder()
  await auth(_.join(" "))
  const data = await getInputs()

  data.forEach((data, i) => {
    writeFileSync(join(inputDirectory, (i + 1).toString()), JSON.stringify(data))
  })

  setInterval(() => {
    Promise.all(readdirSync(outputDirectory)
      .map(file => {
        let data
        try {
          data = readFileSync(join(outputDirectory, file), "utf8")
        } catch (_) {}

        if (!data) {
          return
        }
        const { name } = parse(file)
        const exNumber = Number.parseInt(name).toString()
        if (exNumber === "NaN") {
          return
        }
        sendOutput(data, exNumber)
      })
    )
      .catch(console.error)
  }, 2000)
}

init()
  .catch(console.error)
