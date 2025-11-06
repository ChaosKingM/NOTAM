import re

notam = "!PNM 07/580 ZMP OBST WIND TURBINE FARM WI AN AREA DEFINED AS 5NM RADIUS OF 442334N0984821W (10.9NM SE MKA) 2381FT (590FT AGL) NOT LGTD 2507211810-2607212359"

pattern = re.compile(
    r"!([A-Z]{3})\s+"                  
    r"(\d{2}/\d{3})\s+"               
    r"([A-Z]{3})\s+"                  
    r"(OBST\s+[A-Z\s]+?)\s+"          
    r"WI\s+AN\s+AREA\s+DEFINED\s+AS\s+([0-9NM\sRADIUSOF]+[0-9N]+[0-9W]+)\s+"  
    r"\(([^)]+)\)\s+"                 
    r"(\d+FT)\s+\((\d+FT\s+AGL)\)\s+" 
    r"(NOT\s+LGTD)\s+"               
    r"(\d{10})-(\d{10})"             
)

match = pattern.search(notam)
if match:
    fields = {
        "Location": match.group(1),
        "Number": match.group(2),
        "Control Center": match.group(3),
        "Obstacle": match.group(4).strip(),
        "Area": match.group(5).strip(),
        "Relative Location": match.group(6),
        "Altitude MSL": match.group(7),
        "Altitude AGL": match.group(8),
        "Lighting": match.group(9),
        "Start Time": match.group(10),
        "End Time": match.group(11)
    }

    for k, v in fields.items():
        print(f"{k}: {v}")
