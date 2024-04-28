import express, { Request, Response, query } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getPlacesList, latlong, getCruiserList } from './controllers/places';
import { updatePark4NightCoordinates, updateCruiserList, updatePark4NightDB, feedPark4NightDB } from './services/providers';
import { fetchDataFromPark4Night } from './services/providers/park4night';
import { insertGeoData } from './services/postgresql';

const app = express();
const port = 3000;

//const historyPark4NightURL: string[] = [];
let historyPark4NightData: any = undefined;

setInterval(()=>{
    console.log(`Checking campings to record...`);
    if (historyPark4NightData != undefined) {
        if (historyPark4NightData != undefined) {
            feedPark4NightDB(historyPark4NightData).subscribe(() => {
                historyPark4NightData = undefined;
            })
        }
    }
},300000);  // every 5 minutes

// Add this line to enable CORS for all routes
app.use(cors());

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('Version 2');
});

