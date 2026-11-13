/** One ordered writer per loaded review. A failed/uncertain write blocks later
 * writes until reload; switching viewer/document invalidates queued work. */
export function createReviewSaveQueue(initialRevision: string) {
  let revision = initialRevision, active = true, failed = false, pending = 0;
  let tail: Promise<unknown> = Promise.resolve();
  return {
    get pending() { return pending; }, get failed() { return failed; },
    cancel() { active = false; },
    enqueue(save: (revision: string) => Promise<{ updated_at: string }>) {
      pending++;
      const work = tail.then(async () => {
        if (!active || failed) throw new Error("Reload the review before editing again.");
        const saved = await save(revision);
        if (!active) throw new Error("This review is no longer open.");
        if (!saved.updated_at || saved.updated_at === revision) throw new Error("Reload the review before editing again.");
        revision = saved.updated_at;
        return saved;
      }).catch(error => { failed = true; throw error; }).finally(() => { pending--; });
      tail = work.catch(() => undefined);
      return work;
    },
  };
}
