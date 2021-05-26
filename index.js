const AWS = require('aws-sdk');
const fs = require('fs');
const jimp = require('jimp');
const s3 = new AWS.S3({
  signatureVersion: "v4"
});
const {OLDBUCKET,NEWBUCKET, URL, QUALITY} = process.env;

exports.handler = async(event, context, callback) => {
  const ALLOWED_RESOLUTIONS= process.env.ALLOWED_RESOLUTIONS.split();
  //console.log("process.env.ALLOWED_RESOLUTIONS:"+process.env.ALLOWED_RESOLUTIONS)
  //console.log("ALLOWED_RESOLUTIONS="+JSON.stringify(ALLOWED_RESOLUTIONS));
  //console.log("event="+JSON.stringify(event));
  const objectKey = event.queryStringParameters.key;
  console.log("objectKey="+JSON.stringify(objectKey));
  try {
	const match = objectKey.match(/((\w+)x(\w+))\/(.*)/);
	console.log("match="+JSON.stringify(match));
  //Check if requested resolution is allowed

  if (ALLOWED_RESOLUTIONS.size>0 && match!=null  && !ALLOWED_RESOLUTIONS.has(match[2])) {
    callback(null, {
      statusCode: "403",
      headers: {},
      body: ""
    });
    return;
  }
  let width=null;
  let height=null;

  let originalKey=objectKey;
  if(match!=null){
	//判断宽度是否为字符，如果是字符则为true.数值为false
	const px = match[1];
	width =isNaN(match[2]) ? null : parseInt(match[2], 10);
	height =isNaN(match[3]) ? null : parseInt(match[3], 10);
	console.log("入参传的宽高的值：width="+width+",height="+height);
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
  const image = await jimp.read(inBuffer)
  //获取图像的原始尺寸,以便等比例压缩
  const imageWidth=image.bitmap.width;
  const imageheight=image.bitmap.height;
  console.log(JSON.stringify("imageWidth:"+imageWidth+",imageheight:"+imageheight));
  //Resize the image to width  and heigth .参数只有四种情况：1.全部为空，即连接对应原尺寸；2. 300xh(指定宽，不指定高)；3. wx600(指定高，不指定宽)；4. 300x600 (指定宽和高)
  if(width==null && height==null){
	console.log("不指定宽高，按原尺寸压缩");
	await image.resize(imageWidth,imageheight);
  }else if(width!=null && height!=null){
	console.log("指定宽和高，按指定尺寸压缩");
	await image.resize(width,height);  
  }else if(width!=null && height==null){
	console.log("指定宽，按比例缩放  width="+width);
	let newHeight=parseInt((parseInt(width, 10)*parseInt(imageheight, 10))/parseInt(imageWidth, 10), 10);
	console.log("指定宽，按比例缩放后计算的高度newHeight="+newHeight);
	await image.resize(width,newHeight);  
  }else{
	console.log("指定高，按比例缩放"); 
	 let newWidth=parseInt((parseInt(height, 10)*parseInt(imageWidth, 10))/parseInt(imageheight, 10), 10);
	console.log("指定高，按比例缩放后计算的宽度 newWidth="+newWidth);
	await image.resize(newWidth,height);  
  }

  await image.quality(parseInt(QUALITY));
  return image.getBufferAsync(jimp.MIME_JPEG);
}
