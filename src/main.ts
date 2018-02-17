const puppeteer: any = require("puppeteer");
const Nexmo: any = require("nexmo");
const fs: any = require("fs");

require("dotenv").config();

const API_KEY: string = process.env.API_KEY;
const API_SECRET: string = process.env.API_SECRET;
const PHONE_NUMBER: number = parseInt(process.env.PHONE, 10);
const DELIVERY_URL: string = process.env.URL;

const nexmo: any = new Nexmo({
    apiKey: API_KEY,
    apiSecret: API_SECRET
});

async function scrape(): Promise<string> {

    const browser: any = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page: any = await browser.newPage();
    await page.goto(DELIVERY_URL);

    const result: string = await page.evaluate(() => {

        let status: Element = document.querySelector("#MainContent_Grid > tbody > tr.resultRow > td:nth-child(3)");
        if (status == null) {
            return "Tracking number not found.";
        }


        return status.innerHTML;
    });

    browser.close();
    return result;
}

function hasStatusChanged(deliveryStatus: string): boolean {

    const fileName: string = "../exists.txt";
    let doesExist: boolean = fs.existsSync(fileName);

    if (!doesExist) {

        fs.appendFile(fileName, deliveryStatus, function (err: any): any {
            if (err) {
                throw err;
            }
            console.log("File Saved!");
        });

        return true;

    } else {

        fs.readFile(fileName, (err, data) => {
            if (err) { return false; }

            if (data === deliveryStatus) {
                return false;
            } else {
                return true;
            }

        });

    }
}

let sched: NodeJS.Timer = setInterval(() => {

    console.log("Schedule started: ", new Date().toLocaleString());

    scrape().then(trackingStatus => {
        if (trackingStatus === "Tracking number not found.") {
            console.log(trackingStatus);
        } else {

            let status: boolean = hasStatusChanged(trackingStatus);

            if (status) {
                nexmo.message.sendSms(
                    181818, PHONE_NUMBER, "Delivery Status: " + trackingStatus,
                    (err, responseData) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.dir(responseData);
                        }
                    }
                );
            } else {
                console.log("Status has not changed since last check.");
            }
        }
    });

    console.log("Schedule ended: ", new Date().toLocaleString());


}, 1000 * 60);