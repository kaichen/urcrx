import fs from "fs"
import readline from "readline"

export function normalize(filePath: string): void {
  const readStream = fs.createReadStream(filePath, { encoding: "utf8" })
  const writeStream = fs.createWriteStream(`${filePath}.json.js`, {
    encoding: "utf8"
  })
  const rl = readline.createInterface({ input: readStream })

  const totalLineCount = fs.readFileSync(filePath, "utf8").split("\n").length
  let foundTarget = false
  let currentLineCount = 0

  writeStream.write("export default {\n") // 在文件开头添加 '{'

  rl.on("line", (line) => {
    currentLineCount++
    if (!foundTarget && line.includes("function(e, t, r)")) {
        foundTarget = true
        writeStream.write(line + "\n")
    } else if (foundTarget && currentLineCount <= totalLineCount - 2) {
      writeStream.write(line + "\n")
    }
  })

  rl.on("close", () => {
    writeStream.write("}\n", () => {
      console.log("json.js 文件处理完成")
    })
  })
}
