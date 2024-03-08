import * as fs from 'fs';
import * as path from 'path';
import { DataItem } from './dataItem.interface';

interface Location {
    latitude: number;
    longitude: number;
}

interface Category {
    name: string;
}

interface Campsite {
    id: number;
    name: string;
    date_verified: string;
    description: string;
    location: Location;
    category: Category;
}

async function readDataFolder(): Promise<DataItem[]> {
    const folderPath = path.join(__dirname, '../../../ioverlander');
    const files = fs.readdirSync(folderPath);
    const campsiteData: Campsite[] = [];

    for (const file of files) {
        if (file.endsWith('.json')) {
            const filePath = path.join(folderPath, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            try {
                const jsonData = JSON.parse(fileContent);
                campsiteData.push(...jsonData);
            } catch (error) {
                console.error(`Error parsing JSON file ${file}:`, error);
            }
        }
    }

    // Transform Campsite data to DataItem
    const flatData: DataItem[] = campsiteData.map((campsite: Campsite) => ({
        id: campsite.id.toString(),
        name: campsite.name,
        date_verified: campsite.date_verified,
        description: campsite.description,
        location: campsite.location,
        category: campsite.category,
    }));

    return flatData;
}

const name = 'ioverland'
export { readDataFolder };
export { name }