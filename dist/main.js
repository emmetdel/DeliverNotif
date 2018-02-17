var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const puppeteer = require("puppeteer");
const Nexmo = require("nexmo");
const fs = require("fs");
require("dotenv").config();
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const PHONE_NUMBER = parseInt(process.env.PHONE, 10);
const DELIVERY_URL = process.env.URL;
const nexmo = new Nexmo({
    apiKey: API_KEY,
    apiSecret: API_SECRET
});
let scrape = () => __awaiter(this, void 0, void 0, function* () {
    const browser = yield puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = yield browser.newPage();
    yield page.goto(DELIVERY_URL);
    const result = yield page.evaluate(() => {
        let status = document.querySelector("#MainContent_Grid > tbody > tr.resultRow > td:nth-child(3)");
        if (status == null) {
            return "Tracking number not found.";
        }
        return status.innerHTML;
    });
    browser.close();
    return result;
});
function hasStatusChanged(deliveryStatus) {
    const fileName = "../exists.txt";
    let doesExist = fs.existsSync(fileName);
    if (!doesExist) {
        fs.appendFile(fileName, deliveryStatus, function (err) {
            if (err) {
                throw err;
            }
            console.log("File Saved!");
        });
        return true;
    }
    else {
        fs.readFile(fileName, (err, data) => {
            if (err) {
                return false;
            }
            if (data === deliveryStatus) {
                return false;
            }
            else {
                return true;
            }
        });
    }
}
;
let sched = setInterval(() => {
    console.log("Schedule started: ", new Date().toLocaleString());
    scrape().then(trackingStatus => {
        if (trackingStatus === "Tracking number not found.") {
            console.log(trackingStatus);
        }
        else {
            let status = hasStatusChanged(trackingStatus);
            if (status) {
                nexmo.message.sendSms(181818, PHONE_NUMBER, "Delivery Status: " + trackingStatus, (err, responseData) => {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.dir(responseData);
                    }
                });
            }
            else {
                console.log("Status has not changed since last check.");
            }
        }
    });
    console.log("Schedule ended: ", new Date().toLocaleString());
}, 1000 * 60);
