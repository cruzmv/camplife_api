import express, { Request, Response, query } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getPlacesList, latlong, getCruiserList } from './controllers/places';
import { updatePark4NightCoordinates, updateCruiserList, updatePark4NightDB, feedPark4NightDB } from './services/providers';
import { fetchDataFromPark4Night } from './services/providers/park4night';
import { insertGeoData } from './services/postgresql';
//import { fetchAndProcessPlaylist, getCategories, getChanelByCategory } from './services/providers/foxIpTv';
//const { exec } = require('child_process');


const app = express();
const port = 3000;

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
    origin: 'http://cruzmv.ddns.net', // Allow only this origin
    methods: ['GET', 'POST'], // Allow only GET and POST requests
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow only specified headers
}));

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
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('Version 2');
});


// function main() {
//     fetchAndProcessPlaylist().then(data => {
//         console.log(`Updated ${data.length} channels`);
//     })
// }ls

//main();