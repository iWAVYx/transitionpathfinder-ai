// Exhaustive, complementary groups. Native races stay inside each fixture.
const prefix = '^(?:rescan|registration|capacity|summary)';
export const documentPathPartitions = [
  ['summary automatic settlement', ['--test-name-pattern=^summary auto'], name => /^summary auto/.test(name)],
  ['counted worker', ['--test-name-pattern=^counted worker'], name => /^counted worker/.test(name)],
  ['other boundaries', [`--test-skip-pattern=${prefix}|^counted worker`], name => !/^(?:rescan|registration|capacity|summary|counted worker)/.test(name)],
  ['producer and summary boundaries', ['--test-name-pattern=^(?:registration|capacity|summary)', '--test-skip-pattern=^summary auto'], name => /^(?:registration|capacity|summary)/.test(name) && !/^summary auto/.test(name)],
  ['rescan source and pending', ['--test-name-pattern=^rescan', '--test-skip-pattern=^rescan (?:outcome|settlement)'], name => /^rescan/.test(name) && !/^rescan (?:outcome|settlement)/.test(name)],
  ['rescan outcome', ['--test-name-pattern=^rescan outcome'], name => /^rescan outcome/.test(name)],
  ['rescan settlement', ['--test-name-pattern=^rescan settlement'], name => /^rescan settlement/.test(name)],
];
export const partitionId = name => name.replaceAll(" ", "-");
