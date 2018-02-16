const puppeteer = require('puppeteer');
// const commandLineArgs = require('command-line-args')
const Nexmo = require('nexmo');
const fs = require('fs');

const API_KEY = '96371e58';
const API_SECRET = 'cd4e2509d398aada';
const PHONE = 892031801;
const URL = 'https://track.anpost.ie/TrackingResults.aspx?rtt=1&items=RP240997236GB';

const nexmo = new Nexmo({
    apiKey: API_KEY,
    apiSecret: API_SECRET
});

// const optionDefinitions = [{
//     name: 'url',
//     alias: 'u',
//     type: String
// }]

// const options = commandLineArgs(optionDefinitions)

// if (process.env.URL == null) {
//     console.error('Error: Url string must be passed.')
//     process.exit()
// }

let scrape = async () => {

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let resp = await page.goto(URL);

    const result = await page.evaluate(() => {

        let status = document.querySelector('#MainContent_Grid > tbody > tr.resultRow > td:nth-child(3)');
        if (status == null)
            return 'Tracking number not found.'


        return status.innerHTML
    });

    browser.close();
    return result;
};

scrape().then(trackingStatus => {
    if (trackingStatus === 'Tracking number not found.') {

        console.log(trackingStatus)

    } else {

        let status = hasStatusChanged(trackingStatus);

        if (status) {
            nexmo.message.sendSms(
                181818, PHONE, trackingStatus,
                (err, responseData) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.dir(responseData);
                    }
                }
            );
        } else {
            console.log('Status has not changed since last check.')
        }
    }
});

let hasStatusChanged = (deliveryStatus) => {

    const fileName = './exists.txt'

    let doesExist = fs.existsSync(fileName)

    if (!doesExist) {

        fs.appendFile(fileName, deliveryStatus, function (err) {
            if (err) throw err;
            console.log('File Saved!');
        });

        return true;

    } else {

        fs.readFile(fileName, (err, data) => {
            if (err) throw err;

            if (data === deliveryStatus) {
                return false;
            } else {
                return true;
            }

        });

    }
}