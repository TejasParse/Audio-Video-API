## Major libraries used 

express backend framework  
multer file upload  
mongoose database npm module  
gTTS google text to speech
unique-filename for generating file names
videoshow Simple utility for node.js to create straightforward video slideshows based on images using ffmpeg
cookie-parser for token authentication 

## API Endpoints
/create_new_storage     :  to store token in cookie  to identify uploaded file
/upload_file            : to upload file 
/my_upload_file         : get list of uploaded file 
/text_file_to_audio     : to convert text to audio  
/merge_image_and_audio  : to merge image + audio to video 
/merge_video_and_audio  : to merge video  + audio to video 
/merge_all_video        : to merge list of video 
/download_file          : to download any file from server

The demo of API can be found here
https://youtu.be/zpVoNDXsQko

## How to run

Tu run the API

- install the all dependencies using npm install
- have a mongodb deployement run locally using mongod command then use the server at http://localhost:3000
