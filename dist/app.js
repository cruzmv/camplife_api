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
const park4night_1 = require("./services/providers/park4night");
const postgresql_1 = require("./services/postgresql");
const app = (0, express_1.default)();
const port = 3000;
const historyPark4NightURL = [];
// Add this line to enable CORS for all routes
app.use((0, cors_1.default)());
// Middleware to parse JSON in the request body
app.use(body_parser_1.default.json());
app.get('/proxy_park4night', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, park4night_1.fetchDataFromPark4Night)(req.query.url);
    if (historyPark4NightURL.filter(x => x == req.query.url).length <= 0) {
        (0, providers_1.updatePark4NightDB)(result);
    }
    historyPark4NightURL.push(req.query.url);
    res.json({ message: 'Data retrieved successfully', data: result });
}));
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
app.get('/get_cruiser_list', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cood = {
        lat: String(req.query.lat),
        long: String(req.query.long)
    };
    try {
        const result = yield (0, places_1.getCruiserList)(cood);
        res.json({ message: 'Cruiser places retrieved successfully', data: result });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error retrieving cruiser places' });
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
    yield (0, postgresql_1.insertGeoData)(req.ip, req.body);
    res.json({ message: 'OK' });
}));
app.post('/update_cruiser_list', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, providers_1.updateCruiserList)(req.body);
    res.json({ message: 'OK', result: 'Data has been update into database' });
}));
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('Version 2');
});
//# sourceMappingURL=app.js.map