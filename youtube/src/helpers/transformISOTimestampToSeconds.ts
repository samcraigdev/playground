export const transformISOTimestampToSeconds = (value: string) => {
  const [_, timecode] = value.match(/T(.*)/);
  const segments = timecode.match(/\d+\w/g) || [];
  const time = segments.reduce((acc, segment) => {
    const count = segment.slice(0, -1);
    const measure = segment.slice(-1);
    return acc += measureOffsetDict[measure] * Number(count)
  }, 0)
  return time;
};

const measureOffsetDict: OffsetDict = {
  H: 3600,
  M: 60,
  S: 1
}

interface OffsetDict {
  [key: string]: number;
}

export default transformISOTimestampToSeconds