const { BeanModel } = require("redbean-node/dist/bean-model");

class Incident extends BeanModel {

    /**
     * Return an object that ready to parse to JSON for public
     * Only show necessary data to public
     * @returns {object} Object ready to parse
     */
    toPublicJSON() {
        return {
            id: this.id,
            style: this.style,
            title: this.title,
            content: this.content,
            pin: this.pin,
            created_date: this.created_date,
            last_updated_date: this.last_updated_date,
            incident_id: this.incident_id,
        };
    }
}

module.exports = Incident;
