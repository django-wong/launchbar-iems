/**
 * Try parse a JSON string, or return the fallback value
 *
 * @param      {string}  value     The value
 * @param      {any}     fallback  The fallback
 * @return     {any}
 */
function tryParse(value, fallback) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch(e) {/**/}
    }
    return fallback;
}
/**
 * Dump an object to LaunchBar output
 *
 * @param      {any}  value   The value
 * @return     {Array}
 */
function dump(value) {
    const items = [];
    if (value && typeof value === 'object') {
        Object.keys(value).forEach((key) => {
            const item = {
                title: key,
                icon: 'font-awesome:info-circle'
            };
            const asdadasd = tryParse(value[key], value[key]);
            if (typeof asdadasd === 'object' && asdadasd) {
                item.badge = Array.isArray(asdadasd) ? `${asdadasd.length} item` : 'Object'
                item.children = dump(asdadasd);
            } else {
                if (asdadasd) {
                    item.label = asdadasd.toString();
                    item.children = [{title: item.label}];
                } else {
                    item.badge = 'null';
                }
            }
            items.push(item);
        })
    }
    return items;
}
