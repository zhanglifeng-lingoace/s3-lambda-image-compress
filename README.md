# s3-lambda-image-compress
1.本代码实现语言为nodejs，环境为nodejs12.x
2.本代码库中包含代码和相关的依赖，实现了对指定宽，高的S3图片的指定宽高压缩，而不是裁剪。如果没有指定宽高，则代码会给默认值600x800

3.代码可以直接下载成压缩包，直接使用。前提是需要为自己的lambda的环境变量配置一下几个字段值

ALLOWED_RESOLUTIONS：图像可以压缩尺寸，但是安全考虑加上限制。只允许这些尺寸下的可以执行压缩。

NEWBUCKET：图片压缩后存放的桶

OLDBUCKET：被压缩的图片来源的桶

QUALITY：压缩的比率值

URL:访问压缩后的图片存储桶连接

比如我们现在有一个用户头像在dev.media.zhanglf.com这个存储桶中。具体路径如下：

https://s3-us-west-1.amazonaws.com/dev.media.zhanglf.com/avatar/1926019835/IMG_20171105_140419-387815496.jpg或者cdn链接：
https://dev.cdn.zhanglf.com/avatar/1926019835/IMG_20171105_140419-387815496.jpg

现在我们的程序展示的图片都是拿到像这样的链接，访问的 就是dev桶的资源。但是如果我们想获取仅仅压缩后的图像（图像尺寸不变），只需要访问：

https://resize.cdn.zhanglf.com/avatar/1926019835/IMG_20171105_140419-387815496.jpg

如果想得到指定宽高尺寸后的压缩图片，只需访问：

https://resize.cdn.zhanglf.com/avatar/1926019835/600x450/IMG_20171105_140419-387815496.jpg

如果想得到只指定宽，按源图片等比例缩放的压缩图片，只需访问：

https://resize.cdn.zhanglf.com/avatar/1926019835/600xh/IMG_20171105_140419-387815496.jpg，也即把高度有450改成h字母。

如果想得到只指定高，按源图片等比例缩放的压缩图片，只需访问：

https://resize.cdn.zhanglf.com/avatar/1926019835/wx450/IMG_20171105_140419-387815496.jpg，也即把宽度600改成w字母。

也即是我们的cdn从dev.cdn.zhanglf.com切到resize.cdn.zhanglf.com，那访问的资源就会变成由dev.media.zhanglf.com这个存储桶切到resize.zhanglf.com桶。


可以参考博文具体讲解
版权声明：本文为CSDN博主「万米高空」的原创文章，遵循CC 4.0 BY-SA版权协议，转载请附上原文出处链接及本声明。
原文链接：https://blog.csdn.net/zhanglf02/article/details/117259811
