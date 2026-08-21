// Windows Node 25 can fail inside tsx while resolving the current username.
// A stable process uid lets tsx choose its temporary directory without that lookup.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
}
