"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const places_1 = require("./controllers/places");
const providers_1 = require("./services/providers");
const app = (0, express_1.default)();
const port = 3000;
// Add this line to enable CORS for all routes
app.use((0, cors_1.default)());
// Middleware to parse JSON in the request body
app.use(body_parser_1.default.json());
app.get('/get_place_list', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cood = {
        lat: String(req.query.lat),
        long: String(req.query.long)
    };
    try {
        const result = yield (0, places_1.getPlacesList)(cood);
        res.json({ message: 'Data retrieved successfully', data: result });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
}));
app.post('/update_place_coordinate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Process the data from the request body
    const lat = req.body.lat;
    const long = req.body.long;
    yield (0, providers_1.updatePark4NightCoordinates)(lat, long);
    // Send a response
    res.json({ message: 'Data updated successfully' });
}));
app.post('/log_geo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.body);
    res.json({ message: 'OK' });
}));
app.post('/cruiser_list', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let url = `https://www.gays-cruising.com/en/${req.body.country}`;
    if (req.body.city !== undefined &&
        req.body.country !== undefined &&
        req.body.lat !== undefined &&
        req.body.long !== undefined) {
        url = `https://www.gays-cruising.com/en/${req.body.city}/${req.body.country}#map-zoom=${req.body.zoom}&map-lat=${req.body.lat}&map-lng=${req.body.long}`;
    }
    else if (req.body.city !== undefined) {
        url = `https://www.gays-cruising.com/en/${req.body.city}/${req.body.country}`;
    }
    console.log(`cruiser_list: ${url}`);
    const puppeteer = require('puppeteer');
    const browser = yield puppeteer.launch({ args: ['--no-sandbox'] });
    const page = yield browser.newPage();
    yield page.goto(url);
    yield page.waitForFunction('typeof gcMaps !== "undefined"');
    console.log("Getting places...");
    const result = [];
    for (let mI = 0; mI < 20; mI++) {
        let markerString = `gcMaps.parametros.markers[${mI}]  !== undefined`;
        let markerExists = yield page.evaluate(markerString);
        if (markerExists) {
            let cI = 0;
            while (markerExists) {
                const latlng = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._latlng`);
                const title = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[0].innerText`);
                const place = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[1].innerText`);
                const text = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[2].innerText`);
                const more = yield page.evaluate(`gcMaps.parametros.markers[${mI}][${cI}]._popup._content.children[3].innerText`);
                result.push({
                    latlng: latlng,
                    title: title,
                    place: place,
                    text: text,
                    more: more
                });
                cI++;
                markerString = `gcMaps.parametros.markers[${mI}][${cI}] !== undefined`;
                markerExists = yield page.evaluate(markerString);
                console.log(latlng);
            }
        }
    }
    yield browser.close();
    console.log('OK');
    res.json({ message: 'OK', result: result });
}));
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
//# sourceMappingURL=app.js.map