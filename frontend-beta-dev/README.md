## Build for development and testing:
To build and develop, get the .env in ./ and GoogleService-Info.plist in ./ios <br>
Then run <br>
`npm install` <br>
`cd ios; pod install; xcodebuild clean;` <br>
`npx expo run:ios` <br>
then when in expo simulator, back out and then go in localhost:8081

## Build for release:
Build in xcode at ./ios/trippy.xcworkspace  <br>
In the future will support `eas build`
