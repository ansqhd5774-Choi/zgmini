// Lighthouse CI v0.16.1 (Apache-2.0); local build preview only.
// No public temporary storage, remote upload, or ungrounded score assertions.
module.exports={
 ci:{
  collect:{
   url:['http://127.0.0.1:3000/about'],
   numberOfRuns:1,
   settings:{
    onlyCategories:['performance'],
    chromeFlags:'--no-sandbox --disable-dev-shm-usage'
   }
  },
  upload:{target:'filesystem',outputDir:'artifacts/ci-performance-lighthouse/raw-local'}
 }
};
