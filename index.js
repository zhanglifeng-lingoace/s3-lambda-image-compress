const AWS = require('aws-sdk');
const fs = require('fs');
const jimp = require('jimp');
const s3 = new AWS.S3({
  signatureVersion: "v4"
});
const {OLDBUCKET,NEWBUCKET, URL, QUALITY} = process.env;

exports.handler = async(event, context, callback) => {
  const ALLOWED_RESOLUTIONS= process.env.ALLOWED_RESOLUTIONS.split();
  console.log("process.env.ALLOWED_RESOLUTIONS:"+process.env.ALLOWED_RESOLUTIONS)
  console.log("ALLOWED_RESOLUTIONS="+JSON.stringify(ALLOWED_RESOLUTIONS));
  console.log("event="+JSON.stringify(event));
  const objectKey = event.queryStringParameters.key;
  console.log("objectKey="+JSON.stringify(objectKey));
  try {
	const match = objectKey.match(/((\d+)x(\d+))\/(.*)/);
	console.log("match"+JSON.stringify(match));
  //Check if requested resolution is allowed
  if (ALLOWED_RESOLUTIONS.size>0 && match!=null && !ALLOWED_RESOLUTIONS.has(match[2])) {
    callback(null, {
      statusCode: "403",
      headers: {},
      body: ""
    });
    return;
  }
  let width=600;
  let height=800;
  let originalKey=objectKey;
  if(match!=null){
	const px = match[1];
	width = parseInt(match[2], 10);
	height = parseInt(match[3], 10);
	const paths = objectKey.split(px+"/");
	originalKey = paths[0]+paths[1]; 
  }

  console.log("originalKey:"+JSON.stringify(originalKey));
  // Make a task for each record
  let tasks = [];
  const srcKey = decodeURIComponent(originalKey.replace(/\+/g, " "));
  const destKey = decodeURIComponent(objectKey.replace(/\+/g, " "));
  // 我们这里设置目的存储桶和源存储桶为同一个，通过文件的路径不同防止覆盖。而不是路径一样，放到两个存储桶中。
  tasks.push(conversionPromise(callback,OLDBUCKET,originalKey,objectKey,NEWBUCKET,width,height));
  await Promise.all(tasks)
    .then(() => { context.succeed(); })
    .catch((err) => { context.fail(err); });
	console.log('finish all tasks');
  } catch (error) {
	console.error(error);
  }
}


function conversionPromise(callback,oldBucket,srcKey,destKey, destBucket,width,height) {
  return new Promise((resolve, reject) => {
    // Modify destKey if an alternate copy location is preferred
    const conversion = 'compressing (quality ' + QUALITY + '): ' + oldBucket + ':' + srcKey + ' to ' + destBucket + ':' + destKey;
    console.log('Attempting: ' + conversion);
	
    get(oldBucket, srcKey)
      .then(original => compress(original,width,height))
      .then(modified => put(destBucket, destKey, modified))
      .then(() =>
       callback(null, {
        statusCode: "301",
        headers: { location: `${URL}/${destKey}` },
        body: ""
      }))
      .catch(error => {
        console.error(error);
        return reject(error);
      });
  });
}

function get(oldBucket, srcKey) {
  return new Promise((resolve, reject) => {
    s3.getObject({
      Bucket: oldBucket,
      Key: srcKey
    }, (err, data) => {
      if (err) {
        console.error('Error getting object: ' + oldBucket + ':' + srcKey);
        return reject(err);
      } else {
        resolve(data.Body);
      }
    });
  });
}

function put(destBucket, destKey, data) {
  return new Promise((resolve, reject) => {
    s3.putObject({
      Bucket: destBucket,
      Key: destKey,
	  ContentType: "image/jpeg",
      Body: data
    }, (err, data) => {
      if (err) {
        console.error('Error putting object: ' + destBucket + ':' + destKey);
        return reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function compress(inBuffer,width,height) {
	//Read the image.
  const image = await jimp.read(image)
  console.log(JSON.stringify(originalKey));
  //Resize the image to width  and heigth .
  await image.resize(width,height);
  await image.quality(parseInt(QUALITY));
  return image.getBufferAsync(jimp.MIME_JPEG);
}
