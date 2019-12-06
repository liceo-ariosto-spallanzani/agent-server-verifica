const { url = "http://192.168.1.231:8080", workingDirectory = __dirname } = require("simple-argv")
const fetch = require("node-fetch")
const { ensureDirSync, removeSync } = require("fs-extra")
const { join } = require("path")
const inputDirectory = join(workingDirectory, "input")
const outputDirectory = join(workingDirectory, "output")

const auth = name => fetch(`${url}/accreditamento`, {
	method: "POST",
	headers: {
		"content-type": "application/json"
	},
	body: JSON.stringify({ nome: name })
})
	.then(res => res.json())
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

const saveInputs = async () => {
	const ex = await listEx()
	const data = await Promise.all(ex.map((_, i) => getInput(i)))
	return data
}


const sendOutput = (data, ex) => fetch(`${url}/esercizi/${ex}`, {
	method: "POST",
	headers: {
		"content-type": "application/json"
	},
	body: JSON.stringify({ nome: name })
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

const init = () => {
	setupFolder()
	
}

init()