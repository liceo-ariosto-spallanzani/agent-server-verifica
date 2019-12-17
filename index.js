/* eslint-disable no-console */
const { url = "http://192.168.1.231:8080", workingDirectory = __dirname, _ } = require("simple-argv")
const fetch = require("node-fetch")
const { ensureDirSync, removeSync, readdirSync, readFileSync, writeFileSync } = require("fs-extra")
const { join, parse } = require("path")
const inputDirectory = join(workingDirectory, "input")
const outputDirectory = join(workingDirectory, "output")
const correctEx = new Set()

const getScore = () => fetch(`${url}/voto`)
  .then(res => res.json())
  .then(({ score }) => score || 0)
  .catch(console.error)

const logScore = async () => {
  const score = await getScore()
  console.log(`il tuo punteggio attuale è ${score}`)
}

const getServerStatus = () => fetch(`${url}/agent`)
  .then(res => res.json())
  .catch(console.error)

const auth = name => {
  if (!name) {
    throw new Error("è necessario inserire il NOME dopo il comando di avvio dell'agent")
  }
  return fetch(`${url}/accreditamento`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ nome: name })
  })
    .then(res => res.json())
    .then(({ message }) => console.log(message))
    .catch(console.error)
}

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
  .then(async res => {
    if (res.status === 200 && !correctEx.has(ex)) {
      correctEx.add(ex)
      console.log(`esercizio ${ex} CORRETTO`)
      await logScore()
    }
    return res.json()
  })
  .catch(console.error)

const setupFolder = () => {
  ensureDirSync(workingDirectory)
  removeSync(inputDirectory)
  ensureDirSync(inputDirectory)
  ensureDirSync(outputDirectory)
}

const checkTimeout = agentTimeout => {
  if (agentTimeout && agentTimeout <= new Date().getTime()) {
    console.log("il tempo a disposizione per svolgere il test è terminato!")
    process.exit(0)
  }
}
const init = async () => {
  const status = await getServerStatus()
  const agentTimeout = status.agentTimeout ? new Date(status.agentTimeout).getTime() : null

  if (!status.agent) {
    process.exit(0)
  }
  checkTimeout(agentTimeout)

  setupFolder()

  const ex = await listEx()
  console.log("ESERCIZI:")
  console.log(ex.map(({ message, points }, i) => `${i + 1}) ${message}`).join("\n\n") + "\n")

  await auth(_.join(" "))
  await logScore()
  const data = await getInputs()

  data.forEach((data, i) => {
    writeFileSync(join(inputDirectory, (i + 1).toString()), JSON.stringify(data))
  })

  setInterval(() => {
    checkTimeout(agentTimeout)

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
