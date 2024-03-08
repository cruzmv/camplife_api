import express, { Request, Response, query } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getPlacesList, latlong } from './controllers/places';
import { updatePark4NightCoordinates } from './services/providers';

const app = express();
const port = 3000;

// Add this line to enable CORS for all routes
app.use(cors()); 

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

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

app.post('/update_place_coordinate', async (req: Request, res: Response) => {
    // Process the data from the request body
    const lat = req.body.lat;
    const long = req.body.long;
    
    await updatePark4NightCoordinates(lat, long);

    // Send a response
    res.json({ message: 'Data updated successfully'});
});



app.post('/log_geo', async (req: Request, res: Response) => {
    
    console.log(req.body);
    res.json({ message: 'OK'});

});

app.post('/cruiser_list', async (req: Request, res: Response) => {
    let url = `https://www.gays-cruising.com/en/${req.body.country}`;
    if (req.body.city !== undefined && 
        req.body.country !== undefined && 
        req.body.lat !== undefined && 
        req.body.long !== undefined){
        url = `https://www.gays-cruising.com/en/${req.body.city}/${req.body.country}#map-zoom=${req.body.zoom}&map-lat=${req.body.lat}&map-lng=${req.body.long}`;
    } else if (req.body.city !== undefined){
        url = `https://www.gays-cruising.com/en/${req.body.city}/${req.body.country}`;
    }
    
    console.log(`cruiser_list: ${url}`)
    
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction('typeof gcMaps !== "undefined"');

    console.log("Getting places...");

    const result = []
    for (let mI = 0; mI < 20; mI++) {
        let markerString = `gcMaps.parametros.markers[${mI}]  !== undefined`;
        let markerExists = await page.evaluate(markerString);
        if (markerExists){
            let cI = 0;
            while (markerExists){
                const latlng = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._latlng`);
                const title = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[0].innerText`);
                const place = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[1].innerText`);
                const text = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[2].innerText`);
                const more = await page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[3].innerText`);
                result.push({
                    latlng: latlng,
                    title: title,
                    place: place,
                    text: text,
                    more: more
                })
                cI++;
                markerString = `gcMaps.parametros.markers[${mI}][${cI}] !== undefined`;
                markerExists = await page.evaluate(markerString);   
                console.log(latlng);
            }
        }
    }
    await browser.close();    
    console.log('OK');
    res.json({ message: 'OK', result: result});
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

