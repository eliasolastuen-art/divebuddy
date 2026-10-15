// Rådata för HT2026-schemat, överfört från Claude Design-handoffen.
// Format per rad: "YYYY-MM-DD dag" startar en dag, därefter
//   t|GRUPP[+GRUPP]|start|slut|plats|tränare,tränare   (träningspass)
//   x|titel|notis                                    (inställd träning)
//   e|titel|notis|all                                (gemensamt evenemang)
//   c|titel|notis                                    (tävling, visas ej i listan)
export const SCHEDULE_DSL = `
2026-08-08 lör
e|Uppstartsläger|Alla grupper · 10–16|all
2026-08-09 sön
e|Uppstartsläger|Alla grupper · 10–16|all
2026-08-11 tis
t|TG+FG|17:00|19:00|Land|Maria
t|TG+FG|17:00|19:00|Vatten|Maria
2026-08-13 tor
t|TG+FG|17:00|19:00|Land|Maria
t|TG+FG|17:00|19:00|Vatten|Maria
2026-08-18 tis
t|TG+FG|17:00|19:00|Land|Maria
t|TG+FG|17:00|19:00|Vatten|Maria
2026-08-20 tor
t|TG+FG|17:00|19:00|Land|Maria
t|TG+FG|17:00|19:00|Vatten|Maria
2026-08-22 lör
t|TG+FG|11:00|12:00|Vatten|Maria
2026-08-23 sön
t|TG|||Land|Anna
t|TG|||Vatten|Anna
2026-08-25 tis
t|N2|16:30|17:00|Land|Ville,Leo
t|N2|17:00|17:45|Vatten|Ville,Anna
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Anna,Elias
2026-08-27 tor
t|N1F|16:30|17:00|Land|Leo,Ville
t|N1F|17:00|17:45|Vatten|Leo,Maria
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-08-29 lör
t|N1N|09:00|09:30|Land|Anton,Vega
t|N1N|09:30|10:00|Vatten|Anton,Vega
t|N2|09:30|10:00|Land|Elias
t|N2|10:00|10:45|Vatten|Elias
t|FG|10:00|10:45|Land|Anton,Vega
t|FG|10:45|11:30|Vatten|Elias
t|TG|11:30|12:30|Vatten|Elias
t|TG|12:30|13:45|Styrka Actic|
2026-08-30 sön
t|TG+FG|||Gymnastikens hus|Anna
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
2026-09-01 tis
t|N2|16:30|17:00|Land|Leo,Ville
t|N2|17:00|17:45|Vatten|Leo,Elias
t|TG+FG|17:00|17:45|Land|Anna
t|TG+FG|17:45|19:00|Vatten|Elias,Anna
2026-09-03 tor
t|N1F|16:30|17:00|Land|Ville,Leo
t|N1F|17:00|17:45|Vatten|Ville,Maria
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Elias,Maria
2026-09-05 lör
x|Ingen träning|Simtävling VÖSS
t|TG|12:30|13:45|Styrka Actic|
2026-09-06 sön
x|Ingen träning|Simtävling VÖSS
2026-09-08 tis
t|N2|16:30|17:00|Land|Vega,Leo
t|N2|17:00|17:45|Vatten|Vega,Anna
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Anna,Maria
2026-09-10 tor
t|N1F|16:30|17:00|Land|Leo,Vega
t|N1F|17:00|17:45|Vatten|Leo,Elias
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-09-12 lör
t|N1N|09:00|09:30|Land|Ville,Anton
t|N1N|09:30|10:00|Vatten|Ville,Anton
t|N2|09:30|10:00|Land|Elias
t|N2|10:00|10:45|Vatten|Elias
t|FG|10:00|10:45|Land|Ville,Anton
t|FG|10:45|11:30|Vatten|Elias
t|TG|11:30|12:30|Vatten|Elias
t|TG|12:30|13:45|Styrka Actic|
2026-09-13 sön
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
t|TG+FG|||Gymnastikens hus|Anna
2026-09-15 tis
t|N2|16:30|17:00|Land|Ville,Vega
t|N2|17:00|17:45|Vatten|Ville,Elias
t|TG+FG|17:00|17:45|Land|Anna
t|TG+FG|17:45|19:00|Vatten|Anna,Elias
2026-09-17 tor
t|N1F|16:30|17:00|Land|Vega,Ville
t|N1F|17:00|17:45|Vatten|Vega,Maria
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-09-19 lör
t|N1N|09:00|09:30|Land|Ville,Leo
t|N1N|09:30|10:00|Vatten|Ville,Leo
t|N2|09:30|10:00|Land|Maria
t|N2|10:00|10:45|Vatten|Maria
t|FG|10:00|10:45|Land|Ville,Leo
t|FG|10:45|11:30|Vatten|Maria
t|TG|11:30|12:30|Vatten|Maria
t|TG|12:30|13:45|Styrka Actic|
2026-09-20 sön
t|TG|16:30|17:15|Land|Anna
t|TG|17:15|18:00|Vatten|Anna
2026-09-22 tis
t|N2|16:30|17:00|Land|Leo,Ville
t|N2|17:00|17:45|Vatten|Leo,Anna
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Maria,Anna
2026-09-24 tor
t|N1F|16:30|17:00|Land|Ville,Leo
t|N1F|17:00|17:45|Vatten|Ville,Elias
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Elias,Maria
2026-09-25 fre
c|Tävling: Speedo Dive|25–27 sep · JKPG
2026-09-26 lör
t|N1N|09:00|09:30|Land|Anton,Vega
t|N1N|09:30|10:00|Vatten|Anton,Vega
t|N2|09:30|10:00|Land|Elias
t|N2|10:00|10:45|Vatten|Elias
t|FG|10:00|10:45|Land|Anton,Vega
t|FG|10:45|11:30|Vatten|Elias
t|TG|11:30|12:30|Vatten|Elias
t|TG|12:30|13:45|Styrka Actic|
2026-09-27 sön
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
t|TG|||Gymnastikens hus|Anna
2026-09-29 tis
t|N2|16:30|17:00|Land|Vega,Leo
t|N2|17:00|17:45|Vatten|Vega,Elias
t|TG+FG|17:00|17:45|Land|Anna
t|TG+FG|17:45|19:00|Vatten|Anna,Elias
2026-10-01 tor
t|N1F|16:30|17:00|Land|Leo,Vega
t|N1F|17:00|17:45|Vatten|Leo,Maria
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-10-03 lör
t|N1N|09:00|09:30|Land|Anton,Leo
t|N1N|09:30|10:00|Vatten|Anton,Leo
t|N2|09:30|10:00|Land|Maria
t|N2|10:00|10:45|Vatten|Maria
t|FG|10:00|10:45|Land|Anton,Leo
t|FG|10:45|11:30|Vatten|Maria
t|TG|11:30|12:30|Vatten|Maria
t|TG|12:30|13:45|Styrka Actic|
2026-10-04 sön
t|TG|16:30|17:15|Land|Anna
t|TG|17:15|18:00|Vatten|Anna
2026-10-06 tis
t|N2|16:30|17:00|Land|Ville,Vega
t|N2|17:00|17:45|Vatten|Ville,Anna
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Anna,Maria
2026-10-08 tor
t|N1F|16:30|17:00|Land|Vega,Ville
t|N1F|17:00|17:45|Vatten|Vega,Elias
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-10-10 lör
t|N1N|09:00|09:30|Land|Leo,Vega
t|N1N|09:30|10:00|Vatten|Leo,Vega
t|N2|09:30|10:00|Land|Elias
t|N2|10:00|10:45|Vatten|Elias
t|FG|10:00|10:45|Land|Leo,Vega
t|FG|10:45|11:30|Vatten|Elias
t|TG|11:30|12:30|Vatten|Elias
t|TG|12:30|13:45|Styrka Actic|
2026-10-11 sön
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
t|TG|||Gymnastikens hus|Anna
2026-10-13 tis
t|N2|16:30|17:00|Land|Leo,Ville
t|N2|17:00|17:45|Vatten|Leo,Elias
t|TG+FG|17:00|17:45|Land|Anna
t|TG+FG|17:45|19:00|Vatten|Elias,Anna
2026-10-15 tor
t|N1F|16:30|17:00|Land|Ville,Leo
t|N1F|17:00|17:45|Vatten|Ville,Maria
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Elias,Maria
2026-10-17 lör
x|Ingen träning|Simtävling VÖSS
t|TG|12:30|13:45|Styrka Actic|
2026-10-18 sön
x|Ingen träning|Simtävling VÖSS
2026-10-20 tis
t|N2|16:30|17:00|Land|Vega,Leo
t|N2|17:00|17:45|Vatten|Vega,Anna
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Anna,Maria
2026-10-22 tor
t|N1F|16:30|17:00|Land|Leo,Vega
t|N1F|17:00|17:45|Vatten|Leo,Elias
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-10-24 lör
t|N1N|09:00|09:30|Land|Vega,Ville
t|N1N|09:30|10:00|Vatten|Vega,Ville
t|N2|09:30|10:00|Land|Elias
t|N2|10:00|10:45|Vatten|Elias
t|FG|10:00|10:45|Land|Vega,Ville
t|FG|10:45|11:30|Vatten|Elias
t|TG|11:30|12:30|Vatten|Elias
t|TG|12:30|13:45|Styrka Actic|
2026-10-25 sön
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
t|TG|||Gymnastikens hus|Anna
2026-10-27 tis
t|ALLA|16:30|17:30|Land|Anna,Elias,Ville,Vega
t|ALLA|17:30|19:00|Vatten|Anna,Elias,Ville,Vega
2026-10-29 tor
c|Tävling: Diving Lund|29 okt–1 nov
t|ALLA|16:30|17:30|Land|Maria,Anton,Leo
t|ALLA|17:00|19:00|Vatten|Maria,Anton,Leo
2026-10-31 lör
t|ALLA|09:00|09:30|Land|Maria,Ville,Anton
t|ALLA|09:30|10:00|Teori/lek|Maria,Ville,Anton
t|ALLA|10:00|10:45|Vatten|Maria,Ville,Anton
t|TG|12:30|13:45|Styrka Actic|
2026-11-01 sön
t|TG|16:30|17:15|Land|Anna
t|TG|17:15|18:00|Vatten|Anna
2026-11-03 tis
t|N2|16:30|17:00|Land|Leo,Ville
t|N2|17:00|17:45|Vatten|Leo,Anna
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Maria,Anna
2026-11-05 tor
t|N1F|16:30|17:00|Land|Ville,Leo
t|N1F|17:00|17:45|Vatten|Ville,Elias
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Elias,Maria
2026-11-07 lör
c|Triangel Tävling VÖSS|09–17 · N1, N1F, N2, FG
t|TG|12:30|13:45|Styrka Actic|
2026-11-08 sön
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
t|TG|||Gymnastikens hus|Anna
2026-11-10 tis
t|N2|16:30|17:00|Land|Vega,Leo
t|N2|17:00|17:45|Vatten|Vega,Elias
t|TG+FG|17:00|17:45|Land|Anna
t|TG+FG|17:45|19:00|Vatten|Anna,Elias
2026-11-12 tor
t|N1F|16:30|17:00|Land|Leo,Vega
t|N1F|17:00|17:45|Vatten|Vega,Maria
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-11-14 lör
x|Ingen träning|Simtävling VÖSS
t|TG|12:30|13:45|Styrka Actic|
2026-11-15 sön
x|Ingen träning|Simtävling VÖSS
2026-11-17 tis
t|N2|16:30|17:00|Land|Ville,Vega
t|N2|17:00|17:45|Vatten|Ville,Anna
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Anna,Maria
2026-11-19 tor
t|N1F|16:30|17:00|Land|Vega,Ville
t|N1F|17:00|17:45|Vatten|Vega,Maria
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-11-21 lör
t|N1N|09:00|09:30|Land|Ville,Vega
t|N1N|09:30|10:00|Vatten|Ville,Vega
t|N2|09:30|10:00|Land|Elias
t|N2|10:00|10:45|Vatten|Elias
t|FG|10:00|10:45|Land|Ville,Vega
t|FG|10:45|11:30|Vatten|Elias
t|TG|11:30|12:30|Vatten|Elias
t|TG|12:30|13:45|Styrka Actic|
2026-11-22 sön
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
t|TG|||Gymnastikens hus|Anna
2026-11-24 tis
t|N2|16:30|17:00|Land|Leo,Ville
t|N2|17:00|17:45|Vatten|Leo,Elias
t|TG+FG|17:00|17:45|Land|Anna
t|TG+FG|17:45|19:00|Vatten|Elias,Anna
2026-11-26 tor
t|N1F|16:30|17:00|Land|Ville,Leo
t|N1F|17:00|17:45|Vatten|Ville,Maria
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Elias,Maria
2026-11-28 lör
t|N1N|09:00|09:30|Land|Anton,Vega
t|N1N|09:30|10:00|Vatten|Anton,Vega
t|N2|09:30|10:00|Land|Maria
t|N2|10:00|10:45|Vatten|Maria
t|FG|10:00|10:45|Land|Anton,Vega
t|FG|10:45|11:30|Vatten|Maria
t|TG|11:30|12:30|Vatten|Maria
t|TG|12:30|13:45|Styrka Actic|
2026-11-29 sön
t|TG|16:30|17:15|Land|Anna
t|TG|17:15|18:00|Vatten|Anna
2026-12-01 tis
t|N2|16:30|17:00|Land|Vega,Leo
t|N2|17:00|17:45|Vatten|Vega,Anna
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Anna,Maria
2026-12-03 tor
t|N1F|16:30|17:00|Land|Leo,Vega
t|N1F|17:00|17:45|Vatten|Leo,Elias
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-12-04 fre
c|Tävling: Julklappshoppet|4–6 dec · JKPG
2026-12-05 lör
t|N1N|09:00|09:30|Land|Anton,Leo
t|N1N|09:30|10:00|Vatten|Anton,Leo
t|N2|09:30|10:00|Land|Elias
t|N2|10:00|10:45|Vatten|Elias
t|FG|10:00|10:45|Land|Anton,Leo
t|FG|10:45|11:30|Vatten|Elias
t|TG|11:30|12:30|Vatten|Elias
t|TG|12:30|13:45|Styrka Actic|
2026-12-06 sön
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
t|TG|||Gymnastikens hus|Anna
2026-12-08 tis
t|N2|16:30|17:00|Land|Ville,Vega
t|N2|17:00|17:45|Vatten|Ville,Elias
t|TG+FG|17:00|17:45|Land|Anna
t|TG+FG|17:45|19:00|Vatten|Anna,Elias
2026-12-10 tor
t|N1F|16:30|17:00|Land|Vega,Ville
t|N1F|17:00|17:45|Vatten|Vega,Maria
t|TG+FG|17:00|17:45|Land|Elias
t|TG+FG|17:45|19:00|Vatten|Maria,Elias
2026-12-12 lör
t|N1N|09:00|09:30|Land|Leo,Vega
t|N1N|09:30|10:00|Vatten|Leo,Vega
t|N2|09:30|10:00|Land|Maria
t|N2|10:00|10:45|Vatten|Maria
t|FG|10:00|10:45|Land|Leo,Vega
t|FG|10:45|11:30|Vatten|Maria
t|TG|11:30|12:30|Vatten|Maria
t|TG|12:30|13:45|Styrka Actic|
2026-12-13 sön
t|TG|16:30|17:15|Land|Anna
t|TG|17:15|18:00|Vatten|Anna
2026-12-15 tis
t|N2|16:30|17:00|Land|Leo,Ville
t|N2|17:00|17:45|Vatten|Leo,Anna
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Maria,Anna
2026-12-17 tor
t|N1F|16:30|17:00|Land|Ville,Leo
t|N1F|17:00|17:45|Vatten|Ville,Elias
t|TG+FG|17:00|17:45|Land|Maria
t|TG+FG|17:45|19:00|Vatten|Elias,Maria
2026-12-19 lör
e|Lucia & avslutning HT|Vatten · Alla|all
t|TG|12:30|13:45|Styrka Actic|
2026-12-20 sön
t|VUX|16:30|17:15|Land|Maria
t|VUX|17:15|18:00|Vatten|Maria
`
