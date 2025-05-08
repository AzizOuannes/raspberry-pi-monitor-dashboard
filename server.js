const express = require('express');
const os = require('os');
const osu = require('os-utils');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Serve static files from the 'public' folder
app.use(express.static('public'));

// Serve the live camera feed
app.get('/camera', (req, res) => {
  const cameraUrl = 'http://<raspberry-pi-ip>:8080/?action=stream';  // Replace with your actual IP
  res.send(`
    <html>
      <head>
        <title>Live Camera Feed</title>
      </head>
      <body>
        <h1>Live Camera Feed</h1>
        <img src="${cameraUrl}" alt="Live Camera Feed" />
      </body>
    </html>
  `);
});

// Metrics route to fetch system info
app.get('/metrics', async (req, res) => {
  osu.cpuUsage(cpu => {
    const rx = fs.readFileSync('/sys/class/net/wlan0/statistics/rx_bytes').toString().trim();
    const tx = fs.readFileSync('/sys/class/net/wlan0/statistics/tx_bytes').toString().trim();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    exec('vcgencmd measure_temp', (err, stdoutTemp) => {
      exec("iwconfig wlan0 | grep -i --color signal", (err, stdoutWifi) => {
        const tempMatch = stdoutTemp.match(/temp=([\d.]+)'C/);
        const signalMatch = stdoutWifi.match(/Signal level=(-\d+) dBm/);
        const cpuTemp = tempMatch ? tempMatch[1] : 'N/A';
        const wifiSignal = signalMatch ? signalMatch[1] : 'N/A';

        exec("df -h / | awk 'NR==2 {print $2, $4}'", (err, stdoutDisk) => {
            const [diskTotal, diskFree] = stdoutDisk.trim().split(' ');
            res.json({
              cpuUsage: (cpu * 100).toFixed(1),
              cpuTemp,
              memUsage: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
              uptime: (os.uptime() / 60).toFixed(1),
              diskFree,
              diskTotal,
              rxBytes: (rx / 1024 / 1024).toFixed(2),
              txBytes: (tx / 1024 / 1024).toFixed(2),
              wifiSignal
            });
          });
      });
    });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Dashboard running at http://localhost:${port}`);
});
