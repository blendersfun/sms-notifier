
import * as fs from 'fs';
import * as config from 'config';

export class FileUtils {
    static loadJson(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            fs.readFile(path, function(err, fileBuffer) {
                if (err) {
                    reject(err);
                } else {
                    try {
                        resolve(JSON.parse(fileBuffer.toString()));
                    } catch (err) {
                        reject(err);
                    }
                }
            });
        });
    }
}
