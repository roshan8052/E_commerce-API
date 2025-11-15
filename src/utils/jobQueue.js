const jobs = [];

exports.enqueue = (jobFn, delayMs=0) => {
  setTimeout(() => {
    try {
      jobFn();
    } catch(err){
      console.error('Job error', err);
    }
  }, delayMs);
};
