const puppeteer = require('puppeteer');
const Nexmo = require('nexmo');
const fs = require('fs');

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const PHONE_NUMBER = parseInt(process.env.PHONE, 10);
const URL = process.env.URL;

const nexmo = new Nexmo({
    apiKey: API_KEY,
    apiSecret: API_SECRET
});

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
};

let sched = setInterval(() => {

    console.log('Schedule started: ', new Date().toLocaleString())

    scrape().then(trackingStatus => {
        if (trackingStatus === 'Tracking number not found.') {

            console.log(trackingStatus)

        } else {

            let status = hasStatusChanged(trackingStatus);

            if (status) {
                nexmo.message.sendSms(
                    181818, PHONE_NUMBER, 'Delivery Status: ' + trackingStatus,
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

    console.log('Schedule ended: ', new Date().toLocaleString())


}, 1000 * 60 * 60);