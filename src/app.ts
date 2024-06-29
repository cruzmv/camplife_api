import express, { Request, Response, query } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import https from 'https';
import path from 'path';
import fs from 'fs';
import { getPlacesList, latlong, getCruiserList, getIntermacheList, getcampingcarportugalList, getEuroStopslList } from './controllers/places';
import { updatePark4NightCoordinates, updateCruiserList, updatePark4NightDB, feedPark4NightDB, updateIntermacheList, updateEuroStopsList, updateASAList } from './services/providers';
import { fetchDataFromPark4Night } from './services/providers/park4night';
import { insertGeoData } from './services/postgresql';
//import { fetchAndProcessPlaylist, getCategories, getChanelByCategory } from './services/providers/foxIpTv';
//const { exec } = require('child_process');


const app = express();
//const port = 3000;
const httpPort = 3000; // HTTP port for redirection
const httpsPort = 3001; // HTTPS

// Paths to your SSL certificate and key
const sslKeyPath = path.join(__dirname, 'cert', 'server.key');
const sslCertPath = path.join(__dirname, 'cert', 'server.crt');

// Load SSL certificate and key
const sslOptions = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath)
};

//const historyPark4NightURL: string[] = [];
let historyPark4NightData: any = undefined;

setInterval(()=>{
    console.log(`${new Date().toISOString()} - Checking campings to record...`);
    if (historyPark4NightData != undefined) {
        if (historyPark4NightData != undefined) {

            const toLoad = {
                api_infos: historyPark4NightData.api_infos, 
                lieux: historyPark4NightData.lieux.slice(0,3000), 
                status: historyPark4NightData.status
            };
            if (toLoad.lieux.length > 0 ) {
                historyPark4NightData.lieux = historyPark4NightData.lieux.slice(toLoad.lieux.length);
                console.log(`Leaving ${historyPark4NightData.lieux.length} to record in 5 min.`);
                feedPark4NightDB(toLoad).subscribe(() => {
                    //historyPark4NightData = undefined;
                })
            }
        }
    }
},300000);  // every 5 minutes

// Add this line to enable CORS for all routes
//app.use(cors());

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

app.use(cors({
    origin: '*', // Allow only this origin
    methods: ['GET', 'POST'], // Allow only GET and POST requests
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow only specified headers
}));


// const allowedOrigins = ['http://cruzmv.ddns.net', 'http://localhost'];

// app.use(cors({
//     origin: function(origin, callback) {
//         // Check if the origin is in the allowedOrigins array or if it is undefined (not a CORS request)
//         if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     methods: ['GET', 'POST'], // Allow only GET and POST requests
//     allowedHeaders: ['Content-Type', 'Authorization'] // Allow only specified headers
// }));


// #region Routes
app.get('/proxy_park4night', async (req: Request, res: Response) => {
    const result: any = await fetchDataFromPark4Night(req.query.url as string);
    console.log(`Retriving ${result.lieux.length} campings to ${req.ip}`);
    res.json({ message: 'Campings retrieved successfully', data: result });

    if (historyPark4NightData == undefined ) {
        historyPark4NightData = result;
    } else {
        result.lieux.map((newLocation: any) => {
            const exists = historyPark4NightData.lieux.some((x: any) => x.id === newLocation.id);
            if (!exists) {
                historyPark4NightData.lieux.push(newLocation);
            }
        });
    }
});

app.get('/get_place_list', async (req: Request, res: Response) => {
    const cood: latlong = {
        lat: String(req.query.lat),
        long: String(req.query.long)
    };

    try {
        const result = await getPlacesList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_cruiser_list', async (req: Request, res: Response) => {
    const cood: latlong = {
        lat: String(req.query.lat),
        long: String(req.query.long)
    };

    try {
        const result = await getCruiserList(cood);
        res.json({ message: 'Cruiser places retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving cruiser places' });
    }
});

app.post('/update_place_coordinate', async (req: Request, res: Response) => {
    // Process the data from the request body
    const lat = req.body.lat;
    const long = req.body.long;

    await updatePark4NightCoordinates(lat, long);

    // Send a response
    res.json({ message: 'Data updated successfully'});
});

app.post('/log_geo', async (req: Request, res: Response) => {
    await insertGeoData(req.ip as string,req.body);
    res.json({ message: 'OK'});
});

app.post('/update_cruiser_list', async (req: Request, res: Response) => {
    const result = await updateCruiserList(req.body);
    res.json({ message: 'OK', result: 'Data has been update into database'});
});

// app.get('/get_iptv_categories', async (req: Request, res: Response) => {
//     try {
//         const result = await getCategories();
//         res.json({ message: 'ok', data: result });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ message: 'Error retrieving IPTV categories' });
//     }
// });


// app.get('/get_chanel_by_category', async (req: Request, res: Response) => {
//     try {
//         const result = await getChanelByCategory(req.query.category as string);
//         res.json({ message: 'ok', data: result });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ message: 'Error retrieving IPTV categories' });
//     }
// });

/*
app.get('/play_chanel_by_url', async (req: Request, res: Response) => {
    try {
        const command = `ffplay ${req.query.url}`;
        exec(command, (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send(`Error executing command: ${error.message}`);
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          res.send('Playing video');
        });
        //res.json({ message: 'playing'});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving IPTV categories' });
    }
});
*/

// app.get('/play_channel_by_url', async (req: Request, res: Response) => {
//     try {
//         let last_stdout = '';
//         const command = `mpv ${req.query.url}`;
//         const process = exec(command);

//         process.stdout.on('data', (data: any) => {
//             last_stdout = data;
//             console.log(`stdout: ${data}`);
//         });

//         process.stderr.on('data', (data: any) => {
//             console.error(`stderr: ${data}`);
//         });

//         process.on('close', (code: any) => {
//             console.log(`process exited with code ${code}`);
//             res.send({message: last_stdout});
//             // if (code === 0) {
//             //     res.send('Video finished playing successfully');
//             // } else {
//             //     res.status(500).send(`exited with error code ${code}`);
//             // }
//         });

//         process.on('error', (error: any) => {
//             console.error(`exec error: ${error}`);
//             res.status(500).send(`Error executing command: ${error.message}`);
//         });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ message: 'Error playing video' });
//     }
// });


// Start the server

app.get('/update_intermache_list', async (req: Request, res: Response) => {
    try {
        const result = await updateIntermacheList();
        res.json({ message: 'Data retrieved successfully', data: {} });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_intermache_list', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getIntermacheList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/update_eurostops_list', async (req: Request, res: Response) => {
    try {
        const result = await updateEuroStopsList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_eurostops_list', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getEuroStopslList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/update_campingcarportugal_list', async (req: Request, res: Response) => {
    try {
        const result = await updateASAList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_campingcarportugal_list', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getcampingcarportugalList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

// #endregion

// HTTP server
app.listen(httpPort, () => {
    console.log(`HTTP server running on port ${httpPort}`);
});

// HTTPS server
https.createServer(sslOptions, app).listen(httpsPort, () => {
    console.log(`HTTPS server running on port ${httpsPort}`);
});


/*
const httpApp = express();
httpApp.get('*', (req, res) => {
    res.redirect(`https://${req.hostname}${req.url}`);
});
httpApp.listen(httpPort, () => {
    console.log(`HTTP server running on port ${httpPort} and redirecting to HTTPS`);
});
// Start the HTTPS server
https.createServer(sslOptions, app).listen(port, () => {
    console.log(`HTTPS server running on port ${port}`);
});
*/

// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
//     console.log('Version 2');
// });


// function main() {
//     fetchAndProcessPlaylist().then(data => {
//         console.log(`Updated ${data.length} channels`);
//     })
// }ls

//main();