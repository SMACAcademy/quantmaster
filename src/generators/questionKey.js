/**
 * What makes two questions "the same" for de-duplication. Usually just the
 * question text; but when the data lives in the context (a caselet) or in a
 * table, chart or figure, the same wording over different data is a new question.
 *
 * Kept in its own module so session code can use it without loading the templates.
 */
export function questionKey(question) {
  const data = [question.table, question.chart, question.figure].filter(Boolean);
  if (!data.length && !question.context) return question.question;
  return `${question.question}\n${question.context || ''}\n${data.length ? JSON.stringify(data) : ''}`;
}
