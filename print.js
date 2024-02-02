const fs = require('fs');
const net = require('net');

function readPdf(pdfPath) {
  return fs.readFileSync(pdfPath);
}

function sendBinaryDataToPrinter(printerIP, printerPort, binaryData) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.connect(printerPort, printerIP, () => {
      client.write(binaryData);
      console.log(`Sent pdf to ${printerIP}`);
    });

    client.on('close', () => {
      resolve(printerIP);
    });

    client.on('error', (err) => {
      if (err.code === 'ENETUNREACH') {
        console.error(`Failed to connect to ${printerIP}: Network unreachable`);
      } else {
        console.error(`Error connecting to ${printerIP}: ${err.message}`);
      }
      client.destroy();
      reject({ ip: printerIP, error: err });
    });

    client.on('end', () => {
      //If you want a console log when it's done sending/error put it here
    });
  });
}

async function readIPsFromFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    return data.match(ipRegex);
  } catch (error) {
    console.error('Error reading IPs from file:', error);
    throw error;
  }
}

const printerPort = 9100;
const pdfPath = 'printerPort.pdf';
const ipsFilePath = 'ips.txt';

async function sendToPrinters() {
  try {
    const printerIPs = await readIPsFromFile(ipsFilePath);

    if (!printerIPs) {
      console.log('No valid IP addresses found in the file.');
      return [];
    }

    const allPrintJobs = printerIPs.map((printerIP) => {
      return sendBinaryDataToPrinter(printerIP, printerPort, pdfPath)
        .then((successfulIP) => ({ successfulIP }))
        .catch((error) => ({ ip: printerIP, error }));
    });

    return Promise.all(allPrintJobs);
  } catch (error) {
    console.error('An error occurred:', error);
    throw error;
  }
}


sendToPrinters()
  .then((results) => {
    const successfulIPs = results.filter((result) => result.successfulIP);
    const failedIPs = results.filter((result) => result.error);

    console.log('Successful IPs:', successfulIPs.map((result) => result.successfulIP));
    console.log('Failed IPs:', failedIPs);
  })
  .catch((error) => {
    console.error('An error occurred:', error);
  });