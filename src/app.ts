import express, { NextFunction, Request, Response, query } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import https from 'https';
import path from 'path';
import fs from 'fs';
import { getPlacesList, latlong, getCruiserList, getIntermacheList, getcampingcarportugalList, getEuroStopslList, getareasacList, getPark4NightMyDB, getcampingcarparkList, LAWASHList, getcamperstopList, getcampercontactList, getparkingverde, getBalance } from './controllers/places';
import { updatePark4NightCoordinates, updateCruiserList, updatePark4NightDB, feedPark4NightDB, updateIntermacheList, updateEuroStopsList, updateASAList, updateAREASACList, updateCAMPINGCARPARKList, getREVOLUTIONList, getBLOOMESTLAUNDRYList, updateLAWASHList, searchOpenRoute, updateCAMPERSTOPList, updateCAMPERCONTACTList, updateAIRECAMPINGCARList, updateParkingVerde, getPlannings, addPlanning, editPlanning, deletePlanning, getFinanceSettings, addMoviment, editMoviment, deleteMoviment, toggleMovimentCreditStatus, syncCreditBills, addMovimentAccount, editMovimentAccount, deleteMovimentAccount, addLedgerAccount, editLedgerAccount, deleteLedgerAccount, addStatus, editStatus, deleteStatus } from './services/providers';
import { fetchDataFromPark4Night } from './services/providers/park4night';
import { insertAppAccess, insertGeoData } from './services/postgresql';
import { analyzeFinancialSnapshot } from './services/financialAi';
import { analyzeMovimentReceipt } from './services/receipt';
import { changeUserPassword, getContractJoinCode, getContractOnboardingSetup, getUserProfile, registerWithPassword, requireFinanceAuth, saveContractOnboardingSetup, saveUserProfile, signInWithGoogle, signInWithPassword, withFinanceIdentity } from './auth';
//import { startScanning } from './services/bluethoot';

//import { fetchAndProcessPlaylist, getCategories, getChanelByCategory } from './services/providers/foxIpTv';
//const { exec } = require('child_process');


const app = express();
// Set TRUST_PROXY=1 only when the API is deployed behind one trusted reverse proxy.
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
//const port = 3000;
const httpPort = 3000; // HTTP port for redirection
const httpsPort = 3001; // HTTPS


const os = require('os');


// Paths to your SSL certificate and key
const sslKeyPath = path.join(__dirname, 'cert', 'server.key');

let sslCertPath
//if (os.hostname() == 'ITC0499') {
sslCertPath = path.join(__dirname, 'cert', 'server.cert');
// } else {
//     sslCertPath = path.join(__dirname, 'cert', 'server.crt');
// }


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
app.use(bodyParser.json({ limit: '12mb' }));
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    if (error?.type !== 'entity.too.large' && error?.type !== 'entity.parse.failed') {
        next(error);
        return;
    }

    console.error('[http/body-parser] Request rejected', {
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        contentLength: req.get('content-length'),
        type: error.type,
        limit: error.limit,
        length: error.length,
        message: error.message,
    });
    res.status(error.status ?? 400).json({ message: error.message });
});

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

app.get('/update_areasac_list', async (req: Request, res: Response) => {
    try {
        const result = await updateAREASACList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_areasac_list', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getareasacList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_park4night_from_db', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getPark4NightMyDB(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/update_campingcarpark_list', async (req: Request, res: Response) => {
    try {
        const result = await updateCAMPINGCARPARKList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_campingcarpark_list', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getcampingcarparkList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});


app.get('/get_AEAE_list', async (req: Request, res: Response) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const toGeoJSON = require('togeojson');
        const { DOMParser } = require('xmldom');
        const xml2js = require('xml2js');
        
        // Read the KML file
        const kmlPath = path.join(__dirname, '../resource/AEAE.kml');
        const kml = fs.readFileSync(kmlPath, 'utf8');        

        // Convert KML to GeoJSON
        const kmlDom = new DOMParser().parseFromString(kml);
        const geojson = toGeoJSON.kml(kmlDom);      
        

        // Haversine formula to calculate distance between two points
        const haversineDistance = (coords1: any, coords2: any) => {
            const toRadians = (deg: any) => deg * (Math.PI / 180);
            const R = 6371; // Radius of the Earth in km

            const dLat = toRadians(coords2[1] - coords1[1]);
            const dLon = toRadians(coords2[0] - coords1[0]);
            const lat1 = toRadians(coords1[1]);
            const lat2 = toRadians(coords2[1]);

            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c;
        };

        // Function to filter GeoJSON features based on proximity
        const filterFeaturesByProximity = (geojson: any, lat: any, lon: any, radius: any) => {
            return geojson.features.filter((feature: any) => {
                const [featureLon, featureLat] = feature.geometry.coordinates;
                const distance = haversineDistance([lon, lat], [featureLon, featureLat]);
                return distance <= radius;
            });
        };

        // Example coordinates to search around (latitude, longitude)
        const searchLat = parseFloat((req as any).query.lat);
        const searchLon = parseFloat((req as any).query.long);

        const nearbyFeatures = filterFeaturesByProximity(geojson, searchLat, searchLon, 300);
        res.json({ message: 'Data retrieved successfully', data: nearbyFeatures });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_REVOLUTION_list', async (req: Request, res: Response) => {
    try {
        const result = await getREVOLUTIONList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_BLOOMESTLAUNDRY_list', async (req: Request, res: Response) => {
    try {
        const result = await getBLOOMESTLAUNDRYList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/update_LAWASH_list', async (req: Request, res: Response) => {
    try {
        const result = await updateLAWASHList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_LAWASH_list', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await LAWASHList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/search_openroute', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
        const queryString: any = req.query.q;
        const result = await searchOpenRoute(queryString,cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/update_camperstop_list', async (req: Request, res: Response) => {
    try {
        const result = await updateCAMPERSTOPList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_camperstop_list', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getcamperstopList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/update_campercontact_list', async (req: Request, res: Response) => {
    try {
        const result = await updateCAMPERCONTACTList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_campercontact_list', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getcampercontactList(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/update_airecampingcar_list', async (req: Request, res: Response) => {
    try {
        const result = await updateAIRECAMPINGCARList();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});



app.get('/update_parkingverde', async (req: Request, res: Response) => {
    try {
        const result = await updateParkingVerde();
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_parkingverde', async (req: Request, res: Response) => {
    try {
        const cood: latlong = {
            lat: String(req.query.lat),
            long: String(req.query.long)
        };
    
        const result = await getparkingverde(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.post('/auth/login', async (req: Request, res: Response) => {
    try {
        const session = await signInWithPassword(req.body?.username, req.body?.password);
        if (!session) {
            res.status(401).json({ message: 'Invalid username or password' });
            return;
        }
        res.json({ message: 'Signed in successfully', data: session });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ message: error?.message ?? 'Error signing in' });
    }
});

app.post('/app-access', async (req: Request, res: Response) => {
    const value = (name: string, maxLength: number): string | undefined => {
        const field = req.body?.[name];
        return typeof field === 'string' && field.length > 0
            ? field.slice(0, maxLength)
            : undefined;
    };

    const eventType = value('eventType', 32);
    const eventId = value('eventId', 100);
    const installationId = value('installationId', 100);
    const sessionId = value('sessionId', 100);
    const clientTimestamp = value('clientTimestamp', 40);

    if (!eventId || !eventType || !['app_open', 'app_resume'].includes(eventType) || !installationId || !sessionId) {
        res.status(400).json({ message: 'Invalid access event' });
        return;
    }
    if (clientTimestamp && Number.isNaN(Date.parse(clientTimestamp))) {
        res.status(400).json({ message: 'Invalid client timestamp' });
        return;
    }

    try {
        const requestIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
        await insertAppAccess(requestIp, {
            eventId,
            eventType,
            installationId,
            sessionId,
            clientTimestamp,
            platform: value('platform', 32),
            appVersion: value('appVersion', 32),
            appBuild: value('appBuild', 32),
            appId: value('appId', 150),
            language: value('language', 32),
            timezone: value('timezone', 100),
            screen: value('screen', 32),
            userAgent: req.get('user-agent')?.slice(0, 1000),
            origin: req.get('origin')?.slice(0, 500),
        });
        res.status(201).json({ message: 'Access recorded' });
    } catch (error: any) {
        console.error('[app-access] Unable to record access', error?.message || error);
        res.status(500).json({ message: 'Unable to record access' });
    }
});

app.post('/auth/register', async (req: Request, res: Response) => {
    try {
        const session = await registerWithPassword(
            req.body?.email,
            req.body?.username,
            req.body?.password,
            req.body?.joinCode
        );
        res.status(201).json({ message: 'Registered successfully', data: session });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(400).json({ message: error?.message ?? 'Error registering user' });
    }
});

app.post('/auth/google', async (req: Request, res: Response) => {
    try {
        const session = await signInWithGoogle(req.body?.credential);
        if (!session) {
            res.status(401).json({ message: 'Invalid Google sign-in' });
            return;
        }
        res.json({ message: 'Signed in successfully', data: session });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(401).json({ message: 'Invalid Google sign-in' });
    }
});

app.get('/auth/me', requireFinanceAuth, async (req: Request, res: Response) => {
    try {
        const user = await getUserProfile(req.auth!.userId);
        res.json({ message: 'User retrieved successfully', data: { user } });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving user' });
    }
});

app.post('/auth/me', requireFinanceAuth, async (req: Request, res: Response) => {
    try {
        const user = await saveUserProfile(req.auth!.userId, req.body);
        res.json({ message: 'User saved successfully', data: { user } });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(400).json({ message: error?.message ?? 'Error saving user' });
    }
});

app.post('/auth/password', requireFinanceAuth, async (req: Request, res: Response) => {
    try {
        await changeUserPassword(req.auth!.userId, req.body?.currentPassword, req.body?.newPassword);
        res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(400).json({ message: error?.message ?? 'Error changing password' });
    }
});

app.get('/auth/contract', requireFinanceAuth, async (req: Request, res: Response) => {
    try {
        const contract = await getContractJoinCode(req.auth!.contractId);
        res.json({ message: 'Contract retrieved successfully', data: contract });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving contract' });
    }
});

app.get('/auth/contract/onboarding', requireFinanceAuth, async (req: Request, res: Response) => {
    try {
        const setup = await getContractOnboardingSetup(req.auth!.contractId);
        res.json({ message: 'Contract onboarding retrieved successfully', data: setup });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving contract onboarding' });
    }
});

app.post('/auth/contract/onboarding', requireFinanceAuth, async (req: Request, res: Response) => {
    try {
        const setup = await saveContractOnboardingSetup(req.auth!.contractId, req.body?.onboardingSetup);
        res.json({ message: 'Contract onboarding saved successfully', data: setup });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error saving contract onboarding' });
    }
});

app.use([
    '/get_balance',
    '/add_moviment',
    '/edit_moviment',
    '/delete_moviment',
    '/toggle_moviment_credit_status',
    '/sync_credit_bills',
    '/get_plannings',
    '/add_planning',
    '/edit_planning',
    '/delete_planning',
    '/get_finance_settings',
    '/add_moviment_account',
    '/edit_moviment_account',
    '/delete_moviment_account',
    '/add_ledger_account',
    '/edit_ledger_account',
    '/delete_ledger_account',
    '/add_status',
    '/edit_status',
    '/delete_status',
    '/financial_ai_analysis',
    '/analyze_moviment_receipt'
], requireFinanceAuth);

app.get('/get_balance', async (req: Request, res: Response) => {
    try {
        const result = await getBalance(req.auth!.contractId);
        res.json({ message: 'Data retrieved successfully', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.get('/get_plannings', async (req: Request, res: Response) => {
    try {
        const result = await getPlannings(req.auth!.contractId);
        res.json({ message: 'Plannings retrieved successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ message: error?.message ?? 'Error retrieving plannings' });
    }
});

app.post('/add_planning', async (req: Request, res: Response) => {
    try {
        const result = await addPlanning(withFinanceIdentity(req.body, req));
        res.json({ message: 'Planning added successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('Missing') || error?.message?.includes('not found') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error adding planning' });
    }
});

app.post('/edit_planning', async (req: Request, res: Response) => {
    try {
        const result = await editPlanning(withFinanceIdentity(req.body, req));
        res.json({ message: 'Planning updated successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('Missing') || error?.message?.includes('not found') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error editing planning' });
    }
});

app.post('/delete_planning', async (req: Request, res: Response) => {
    try {
        const result = await deletePlanning(withFinanceIdentity(req.body, req));
        res.json({ message: 'Planning deleted successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('not found') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error deleting planning' });
    }
});

app.post('/add_moviment', async (req: Request, res: Response) => {
    try {
        const result = await addMoviment(withFinanceIdentity(req.body, req));
        res.json({ message: 'Moviment added successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error adding moviment' });
    }
});

app.post('/edit_moviment', async (req: Request, res: Response) => {
    try {
        const result = await editMoviment(withFinanceIdentity(req.body, req));
        res.json({ message: 'Moviment updated successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message === 'Moviment not found' || error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error editing moviment' });
    }
});

app.post('/delete_moviment', async (req: Request, res: Response) => {
    try {
        const result = await deleteMoviment(withFinanceIdentity(req.body, req));
        res.json({ message: 'Moviment deleted successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message === 'Moviment not found' || error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error deleting moviment' });
    }
});

app.post('/toggle_moviment_credit_status', async (req: Request, res: Response) => {
    try {
        const result = await toggleMovimentCreditStatus(withFinanceIdentity(req.body, req));
        res.json({ message: 'Moviment credit status updated successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message === 'Moviment not found' || error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error updating moviment credit status' });
    }
});

app.post('/sync_credit_bills', async (req: Request, res: Response) => {
    try {
        const result = await syncCreditBills(withFinanceIdentity(req.body, req));
        res.json({ message: 'Credit bills synchronized successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('Missing') || error?.message?.includes('not found') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error synchronizing credit bills' });
    }
});

app.get('/get_finance_settings', async (req: Request, res: Response) => {
    try {
        const result = await getFinanceSettings(req.auth!.contractId);
        res.json({ message: 'Finance settings retrieved successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error retrieving finance settings' });
    }
});

app.post('/financial_ai_analysis', async (req: Request, res: Response) => {
    try {
        const [rows, settings] = await Promise.all([
            getBalance(req.auth!.contractId),
            getFinanceSettings(req.auth!.contractId),
        ]);
        const result = await analyzeFinancialSnapshot({
            period: req.body?.period,
            rows,
            settings,
        });

        res.json({ message: 'Financial analysis generated successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error generating financial analysis' });
    }
});

app.post('/add_moviment_account', async (req: Request, res: Response) => {
    try {
        const result = await addMovimentAccount(withFinanceIdentity(req.body, req));
        res.json({ message: 'Account added successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error adding account' });
    }
});

app.post('/edit_moviment_account', async (req: Request, res: Response) => {
    try {
        const result = await editMovimentAccount(withFinanceIdentity(req.body, req));
        res.json({ message: 'Account updated successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message === 'Account not found' || error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error editing account' });
    }
});

app.post('/delete_moviment_account', async (req: Request, res: Response) => {
    try {
        const result = await deleteMovimentAccount(withFinanceIdentity(req.body, req));
        res.json({ message: 'Account deleted successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message === 'Account not found' || error?.message?.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error deleting account' });
    }
});

app.post('/add_ledger_account', async (req: Request, res: Response) => {
    try {
        const result = await addLedgerAccount(withFinanceIdentity(req.body, req));
        res.json({ message: 'Ledger account added successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error adding ledger account' });
    }
});

app.post('/edit_ledger_account', async (req: Request, res: Response) => {
    try {
        const result = await editLedgerAccount(withFinanceIdentity(req.body, req));
        res.json({ message: 'Ledger account updated successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('not found') || error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error editing ledger account' });
    }
});

app.post('/delete_ledger_account', async (req: Request, res: Response) => {
    try {
        const result = await deleteLedgerAccount(withFinanceIdentity(req.body, req));
        res.json({ message: 'Ledger account deleted successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('not found') || error?.message?.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error deleting ledger account' });
    }
});

app.post('/add_status', async (req: Request, res: Response) => {
    try {
        const result = await addStatus(withFinanceIdentity(req.body, req));
        res.json({ message: 'Status added successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error adding status' });
    }
});

app.post('/edit_status', async (req: Request, res: Response) => {
    try {
        const result = await editStatus(withFinanceIdentity(req.body, req));
        res.json({ message: 'Status updated successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('not found') || error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error editing status' });
    }
});

app.post('/delete_status', async (req: Request, res: Response) => {
    try {
        const result = await deleteStatus(withFinanceIdentity(req.body, req));
        res.json({ message: 'Status deleted successfully', data: result });
    } catch (error: any) {
        console.error('Error:', error);
        const statusCode = error?.message?.includes('not found') || error?.message?.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error deleting status' });
    }
});

app.post('/analyze_moviment_receipt', async (req: Request, res: Response) => {
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();

    console.log('[receipt/http] Request received', {
        requestId,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        contentLength: req.get('content-length'),
        contractId: req.auth!.contractId,
    });

    try {
        const result = await analyzeMovimentReceipt({ ...req.body, requestId });
        console.log('[receipt/http] Request completed', {
            requestId,
            durationMs: Date.now() - startedAt,
        });
        res.json({ message: 'Receipt analyzed successfully', data: result });
    } catch (error: any) {
        console.error('[receipt/http] Request failed', {
            requestId,
            durationMs: Date.now() - startedAt,
            message: error?.message,
            stack: error?.stack,
        });
        const statusCode = error?.message?.includes('Invalid') || error?.message?.includes('Missing') ? 400 : 500;
        res.status(statusCode).json({ message: error?.message ?? 'Error analyzing receipt' });
    }
});

// app.get('/bluethoot', async (req: Request, res: Response) => {
//     try {

//         const devices = await startScanning();
//         const deviceInfo = devices.map(device => ({
//           id: device.id,
//           name: device.advertisement.localName || 'Unknown',
//           address: device.address,
//           rssi: device.rssi
//         }));        

//         res.json({ message: 'Data retrieved successfully', data: deviceInfo });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ message: 'Error retrieving data' });
//     }
// });


app.get('/', async (req: Request, res: Response) => {
    console.log(`Ping from ${req.ip}`);
});

// #endregion

// HTTP server
// app.listen(httpPort, () => {
//     console.log(`HTTP server running on port ${httpPort}`);
// });

// HTTPS server
// https.createServer(sslOptions, app).listen(httpsPort, () => {
//     console.log(`HTTPS server running on port ${httpsPort}`);
// });

app.listen(3000, '0.0.0.0', () => {
  console.log('HTTP server running on port 3000');
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
