const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../tasks.json');

const initializeDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initialData = {
      tasks: [],
      categories: ['work', 'personal', 'shopping', 'health'],
      lastId: 0
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
};

const readData = async () => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    throw new Error('Failed to read data');
  }
};

const writeData = async (data) => {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data file:', error);
    throw new Error('Failed to write data');
  }
};

const getNextId = async () => {
  const data = await readData();
  data.lastId += 1;
  await writeData(data);
  return data.lastId;
};

module.exports = {
  initializeDataFile,
  readData,
  writeData,
  getNextId
};
