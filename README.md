# Cloudy Calculator – Updated & Revived

This project is an updated, fully offline rebuild of the **Cloudy Calculator** Chrome extension,  
created after the original was shut down and removed from the Chrome Web Store.

It keeps the same intuitive, powerful calculation features users loved,  
while modernizing the internals for better unit handling, improved plural recognition,  
and bug fixes for mixed-unit arithmetic.

---

## 🚀 About this update

- Based on the original Cloudy Calculator, but rebuilt from scratch to run locally
- Fully passes the **395 comprehensive tests** in `comprehensive_tests.html` with **100% success**
- Enhanced unit parsing: recognizes plurals and common aliases (`liters`, `lbs`, `metres`, `hours`, …)
- No dependencies on online services for math or unit conversions
- Runs entirely offline — **no user data is stored or sent anywhere**

---

## ✨ Features

- **Mixed-unit math**: `10 lb - 2 kg in g`, `2 cups + 500 ml in liters`
- **Unit conversions**: length, area, volume, mass, time, speed
- **Temperature conversions**: `32 F to C`, `100 C to K`
- **Number bases**: binary, octal, hex, decimal
- **Math functions**: `sin`, `cos`, `log`, `sqrt`, `pow`, `factorial`, …
- **Physical & mathematical constants**: `pi`, `e`, `c` (speed of light), `phi`, …
- **Plural & alias handling**: `litres`, `lbs`, `metres`, `minutes`, …
- **(Optional) Currency conversion**: e.g., `100 USD to EUR` (stub by default; add API if desired)

---

## 🧪 Testing

This version has been run against the **full 395-case comprehensive test suite**  
(`comprehensive_tests.html`) and passed **100%** without failures.  
Tests cover:
- All supported units & aliases
- Temperature & currency conversions
- Mixed-unit arithmetic
- Base number conversions
- Mathematical function evaluations
- Constant resolution
- Error handling for invalid expressions

---

## 🔒 Privacy

- **No tracking, no telemetry, no analytics**
- All calculations happen locally in your browser
- No user data is ever stored or transmitted
