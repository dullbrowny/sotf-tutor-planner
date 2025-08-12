# Find stray boards/labels
grep -RInE "ICSE|State|IB|IGCSE|CBSE\s*Class(es)?\s*(6|7|11|12)|Grade\s*(6|7|11|12)|Std\.?\s*(6|7|11|12)" src

# Common selector components/labels
grep -RInE "Class(Select|es?)|Grade(Select)?|Subject(Select)?|Board(Select)?" src

# Any subject sets beyond Math/Science in current flows
grep -RInE "English|Social|SST|History|Geography|Civics" src

# Places that set option arrays inline (quick smell test)
grep -RInE "\[(\"|\')?(8|9|10)(\"|\')?.*\]" src | grep -E "options|subjects|classes|grades|menu|select"

