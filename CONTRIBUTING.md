# Contributing to QuantMaster

Thank you for helping learners. Corrections, new questions, translations and code
are all welcome. Every change is checked automatically before it is merged.

## Talk about it first

- **Puzzle of the week:** a new puzzle every Monday in [Discussions → Q&A](https://github.com/SMACAcademy/quantmaster/discussions/categories/q-a). Post your method.
- **Ideas:** a topic your exam has and QuantMaster lacks, a simulation you wish existed: [Discussions → Ideas](https://github.com/SMACAcademy/quantmaster/discussions/categories/ideas).
- **Stuck on a question?** Every solution in the app has an "Ask or share a quicker way" link that starts a discussion with the question filled in.

## Report a mistake

Found a wrong answer, a confusing question or a figure that does not match its
text? Use **Report a problem with this question** under any solution in the app (it fills in the topic and question for you), or open an issue with the **Content error** template. Include the topic, the
question (or a screenshot) and what you think is wrong. That alone is a big help.

## Change or add content

Content lives in `src/data/content/<topicId>.json` (Percentages uses the split
files in `src/data/concepts|formulas|levels|questions/`). The format is described
in [docs/DATA_MODEL.md](docs/DATA_MODEL.md), and the step-by-step guide is
[docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md).

You can also work in a spreadsheet:

```bash
npm run content:export -- <topicId>        # writes content-sheets/<topicId>.xlsx
# edit it in Excel, LibreOffice or Google Sheets
npm run content:import -- content-sheets/<topicId>.xlsx          # shows what would change
npm run content:import -- content-sheets/<topicId>.xlsx --write  # saves it
```

**Quality bar for questions**
- Work the answer out yourself, and if you can, check it a second way.
- Exactly one option is correct; no option equals the answer in another form (5 : 2 and 25 : 10).
- Wrong options should be real mistakes a learner makes, not random numbers.
- Give every fact the question needs, and only one reasonable reading.
- Figures are drawn to scale from the question's numbers and never show the answer.
- Write original questions. Do not copy from past papers, books or other apps.

Then run `npm run validate-data` and `npm test`.

By contributing content you agree to license it under CC BY-SA 4.0
([CONTENT-LICENSE.md](CONTENT-LICENSE.md)).

## Change the code

```bash
npm install
npm run dev            # http://localhost:5173
npm run check:full     # validation, unit tests, build and browser tests
```

- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first: views render, services
  hold the learning logic (no DOM, no storage), repositories are the only code
  that touches storage.
- Keep the app server-free: no accounts, no tracking, no calls to outside services.
- Plain JavaScript and no runtime dependencies, so anyone can read it.
- Add or update tests with the change. Pure logic is unit-tested
  (`tests/*.test.js`); flows through real screens are browser-tested
  (`tests/e2e/`).

By contributing code you agree to license it under the MIT licence ([LICENSE](LICENSE)).

## Pull requests

1. Fork the repository and create a branch.
2. Make your change, and run `npm run check:full` (or at least
   `npm run validate-data && npm test`).
3. Open a pull request saying what changed and why. CI runs the same checks.
4. A maintainer reviews it. Small, focused pull requests are merged fastest.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).
