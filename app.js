const PORT = 3000;

const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const gTTS = require('gtts');
let uniqueFilename = require('unique-filename');
const fs = require('fs');
let videoshow = require("videoshow");
const { exec } = require('child_process');
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const { Token } = require("./models/Token");


mongoose.connect("mongodb://localhost:27017/AudioVideoAPI")
    .then(()=>{
        console.log("Mongodb connected");
    })
    .catch(err=>{
        console.log("Mongodb connection failed");
        console.log(err);
    })

const storage = multer.diskStorage({
    destination: "./public/uploads",
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

app.listen(PORT,()=>{
    console.log("Listening to Port 3000");
});

const verifyToken = (req,res,next)=>{

    if(req.cookies.token) {
        return next();
    }

    const response = {
        status: "error",
        message: "Please create a storage token"
    };
    res.send(response);
};

app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieParser());

app.post("/create_new_storage", async (req,res)=>{

    console.log(req.cookies);

    if(!req.cookies.token) {

        const newToken = new Token({});
        await newToken.save();
        res.cookie("token",newToken._id);
    }

    const response = {
        "status": "ok",
        "message": "Storage Created Successfully"
    };
    res.send(response);
    
})

app.post("/upload_file",verifyToken,(req,res)=>{

    let upload = multer({ storage: storage }).single('my_file');

    

    upload(req, res, async function(err) {

        console.log("File Input");
        console.log(req.file);
        console.log(req.files);
        console.log(req.body);

        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        }
        else if (!req.file) {
            return res.send('Please select an image to upload');
        }
        else if (err instanceof multer.MulterError) {
            return res.send(err);
        }
        else if (err) {
            return res.send(err);
        }

        const response = {
            status: "ok",
            "file_path": req.file.path
        };

        
        const tokenDb = await Token.findById(req.cookies.token);
        tokenDb.files.push({
            filename: req.file.filename,
            filepath: req.file.path
        });
        await tokenDb.save();

        res.send(response);

    });

});

app.post("/text_file_to_audio",verifyToken,(req,res)=>{

    console.log(req.body);

    let uniqueTmpfile = uniqueFilename('public/uploads', 'my-file')+".mp3"

    try {
        // const data = fs.readFileSync('public/uploads/text.txt', 'utf8');
        const data = fs.readFileSync(req.body.file_path, 'utf8');
        console.log(data);
        let gtts = new gTTS(data, 'en');
        gtts.save(path.join(__dirname,uniqueTmpfile),async function (err, result) {
            if(err) { throw new Error(err) }

            const response = {
                status: "ok",
                message: "text to speech converted",
                audio_file_path: uniqueTmpfile
            };

            const tokenDb = await Token.findById(req.cookies.token);
            tokenDb.files.push({
                filename: uniqueTmpfile.substring(15),
                filepath: uniqueTmpfile
            });
            await tokenDb.save();

            console.log(`Success! Open file ${uniqueTmpfile} to hear result.`);
            res.send(response);
        });
    } catch (err) {
        console.error(err);
    }

    

});

app.post("/merge_image_and_audio",verifyToken,(req,res)=>{
    
    let uniqueTmpfile = uniqueFilename('public/uploads', 'my-file')+".mp4"
    
    let images = [
        req.body.image_file_path,
    ]
    
    let videoOptions = {
        fps: 25,
        videoBitrate: 1024,
        videoCodec: 'libx264',
        size: '640x?',
        audioBitrate: '128k',
        audioChannels: 2,
        format: 'mp4',
        pixelFormat: 'yuv420p'
    }
    
    videoshow(images, videoOptions)
    .audio(req.body.audio_file_path)
    .save(uniqueTmpfile)
    .on('start', function (command) {
        console.log('ffmpeg process started:', command)
    })
    .on('error', function (err, stdout, stderr) {
        console.error('Error:', err)
        console.error('ffmpeg stderr:', stderr)
    })
    .on('end', async function (output) {
        const response = {
            status: "ok",
            message: "Video Created Successfully",
            video_file_path: output
        };

        const tokenDb = await Token.findById(req.cookies.token);
        tokenDb.files.push({
                filename: uniqueTmpfile.substring(15),
                filepath: uniqueTmpfile
            });
        await tokenDb.save();

        res.send(response);
        
        console.error('Video created in:', output)
    });
    
});

app.post("/merge_video_and_audio",verifyToken,(req,res)=>{

    let uniqueTmpfile = uniqueFilename('public/uploads', 'my-file')+".mp4";

    exec(`ffmpeg -i ${req.body.video_file_path} -i ${req.body.audio_file_path} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 ${uniqueTmpfile}`,async (error,stdout,stderr)=>{

        if(error) {
            return console.log(`Error: ${error}`);
        } 
        
        console.log(`Stdout: ${stdout}`);

        const response = {
            status: "ok",
            message: "Video and Audio Merged Successfully",
            video_file_path: uniqueTmpfile
        };
        console.log("Sending response");

        const tokenDb = await Token.findById(req.cookies.token);
        tokenDb.files.push({
                filename: uniqueTmpfile.substring(15),
                filepath: uniqueTmpfile
            });
        await tokenDb.save();

        res.send(response);

    });

});

app.get("/download_file",verifyToken,(req,res)=>{

    const { file_path } = req.query;

    res.download(file_path);
    
});

app.post("/merge_all_video",verifyToken,(req,res)=>{

    let uniqueTmpfile = uniqueFilename('public/uploads', 'my-file')+".mp4";

    const fileNames = req.body.video_file_path_list;

    let temp = "";

    for( let i=0;i<fileNames.length;i++) {
        temp+= "file '"+fileNames[i] + "'"+"\n";
    }

    fs.writeFileSync("newfile.txt",temp);

    exec(`ffmpeg -f concat -safe 0 -i newfile.txt -c copy ${uniqueTmpfile}`,async (error,stdout,stderr)=>{

        if(error) {
            return console.log(error);
        }

        const response = {
            status: "ok",
            message: "Merged All Video Successfully",
            video_file_path: uniqueTmpfile
        }


        const tokenDb = await Token.findById(req.cookies.token);
        tokenDb.files.push({
                filename: uniqueTmpfile.substring(15),
                filepath: uniqueTmpfile
            });
        await tokenDb.save();
        fs.unlinkSync("newfile.txt");
        res.send(response);

    });



});

app.get("/my_upload_file", verifyToken,async (req,res)=>{

    const tokenDb = await Token.findById(req.cookies.token);

    console.log(tokenDb);

    let filesNameList = []

    for(let i=0;i<tokenDb.files.length;i++) {
        filesNameList.push(tokenDb.files[i].filename);
    }


    let response = {
        status: "ok",
        data: filesNameList
    }

    res.send(response);

});

app.get("/public/uploads/:file_name",verifyToken,(req,res)=>{

    const { file_name } = req.params;

    res.sendFile(`public/uploads/${file_name}`,{ root: path.join(__dirname) })
})

app.get("*",(req,res)=>{
    const response = {
        status:"error",
        message: "Route does not exist"
    };
    res.send(response);
})

app.use((err,req,res,next)=>{
    const response = {
        status:"fail",
        message: err.message
    };

    res.send(response);
});

