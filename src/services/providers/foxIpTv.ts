// import axios from 'axios';
// import readline from 'readline';

// export let tv_data: PlaylistItem[] = [];

// let readingChannels = false;

// // A simple structure to hold the playlist items
// class PlaylistItem {
//     tvgId: string;
//     tvgName: string;
//     tvgLogo: string;
//     groupTitle: string;
//     url: string | null;

//     constructor(tvgId: string, tvgName: string, tvgLogo: string, groupTitle: string, url: string | null) {
//         this.tvgId = tvgId;
//         this.tvgName = tvgName;
//         this.tvgLogo = tvgLogo;
//         this.groupTitle = groupTitle;
//         this.url = url;
//     }
// }

// // Function to parse the #EXTINF line
// function parseExtinf(line: string): PlaylistItem | null {
//     const regex = /#EXTINF:-1 (tvg-id="([^"]*)"\s*)?tvg-name="([^"]*)" tvg-logo="([^"]*)" group-title="([^"]*)",(.+)/;
//     const match = line.match(regex);
//     if (match) {
//         return new PlaylistItem(match[2] || '', match[3], match[4], match[5], '');
//     }
//     return null;
// }

// // Main function to fetch and process the playlist
// export async function fetchAndProcessPlaylist(): Promise<PlaylistItem[]> {
//     return new Promise((resolve, reject) => {
//         if (tv_data.length === 0 && !readingChannels) {
//             axios({
//                 method: 'get',
//                 url: 'http://cdn-ky.com:80/playlist/ZjWxTDKbTZ/aKTJDVDPC6/m3u_plus?output=hls',
//                 responseType: 'stream',
//             }).then((response) => {
//                 readingChannels= true;
//                 const rl = readline.createInterface({
//                     input: response.data,
//                     crlfDelay: Infinity,
//                 });
    
//                 const playlist: PlaylistItem[] = [];
//                 let currentItem: PlaylistItem | null = null;
    
//                 rl.on('line', (line: string) => {
//                     line = line.trim();
//                     if (line.startsWith('#EXTINF')) {
//                         currentItem = parseExtinf(line);
//                     } else if (line && !line.startsWith('#')) {
//                         if (currentItem) {
//                             currentItem.url = line;
//                             playlist.push(currentItem);
//                             console.log(playlist.length);
//                             currentItem = null;
//                         }
//                     }
//                 });
    
//                 rl.on('close', () => {
//                     tv_data = playlist
//                     readingChannels = false;
//                     resolve(playlist);
//                 });
    
//                 rl.on('error', (error) => {
//                     readingChannels = false;
//                     reject(error);
//                 });
//             }).catch((error) => {
//                 readingChannels = false;
//                 reject(error);
//             });

//         } else {
//             resolve(tv_data);
//         }
//     });
// }


// export async function getCategories() {
//     if (tv_data.length === 0) {
//         await fetchAndProcessPlaylist();
//     }

//     const categories: any = [];
//     tv_data.forEach((channel: PlaylistItem) => {
//         const groupTitle = channel.groupTitle.replace('-',' ').split(' ');
//         let category = undefined;
//         const [categotyName, ...subCategoryName] = groupTitle;
//         const categoryIndex: any = categories.findIndex((x: any) => x.name == categotyName)
//         if (categoryIndex < 0) {
//             category = {
//                 name: categotyName.trim(),
//                 subCategory: []
//             }
//             categories.push(category);
//         } else {
//             category = categories[categoryIndex];
//         }

//         if (groupTitle.length > 1) {
//             const subCategoryIndex = category.subCategory.findIndex((x: any) => x.name == subCategoryName.join(' '));
//             if (subCategoryIndex < 0 ) {
//                 category.subCategory.push({
//                     name: subCategoryName.join(' ').trim(),
//                     groupTitle: channel.groupTitle,
//                 })
//             }
//         }

//     });

//     return categories;
// }


// export async function getChanelByCategory(category: string): Promise<PlaylistItem[]> {
//     if (tv_data.length === 0) {
//         await fetchAndProcessPlaylist();
//     }

//     const groupedChannels: any = [];
//     const channels = tv_data.filter((item: PlaylistItem) => item.groupTitle === category);

//     channels.forEach((channel: any) => {
//         const splitTitle = channel.tvgName.split(' ');
//         const lastWord = splitTitle[splitTitle.length - 1];
//         const seriesRegex = /^S\d{2}E\d{2}$/;

//         if (seriesRegex.test(lastWord)) {
//             const groupName = splitTitle.slice(0, -1).join(' ');
//             let group = groupedChannels.find((x: any) => x.groupName === groupName);

//             if (!group) {
//                 group = { 
//                     groupName: groupName, 
//                     tvgLogo: channel.tvgLogo,
//                     channels: [] 
//                 };
//                 groupedChannels.push(group);
//             }

//             group.channels.push(channel);
//         } else {
//             groupedChannels.push({ 
//                 groupName: channel.tvgName, 
//                 tvgLogo: channel.tvgLogo,
//                 channels: [channel] 
//             });
//         }
//     });

//     return groupedChannels;
// }