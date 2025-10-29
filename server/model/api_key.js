const { BeanModel } = require("redbean-node/dist/bean-model");
const { R } = require("redbean-node");
const dayjs = require("dayjs");
const { log } = require("../../src/util");
const { storeWithAutoFallback } = require("../utils/database-utils");
const Database = require("../database");

class APIKey extends BeanModel {
    /**
     * Get the current status of this API key
     * @returns {string} active, inactive or expired
     */
    getStatus() {
        let current = dayjs();
        let expiry = dayjs(this.expires);
        if (expiry.diff(current) < 0) {
            return "expired";
        }

        return this.active ? "active" : "inactive";
    }

    /**
     * Returns an object that ready to parse to JSON
     * @returns {object} Object ready to parse
     */
    toJSON() {
        return {
            id: this.id,
            key: this.key,
            name: this.name,
            userID: this.user_id,
            createdDate: this.created_date,
            active: this.active,
            expires: this.expires,
            status: this.getStatus(),
        };
    }

    /**
     * Returns an object that ready to parse to JSON with sensitive fields
     * removed
     * @returns {object} Object ready to parse
     */
    toPublicJSON() {
        return {
            id: this.id,
            name: this.name,
            userID: this.user_id,
            createdDate: this.created_date,
            active: this.active,
            expires: this.expires,
            status: this.getStatus(),
        };
    }

    /**
     * Create a new API Key and store it in the database
     * @param {object} key Object sent by client
     * @param {int} userID ID of socket user
     * @returns {Promise<bean>} API key
     */
    static async save(key, userID) {
        let bean;
        bean = R.dispense("api_key");

        bean.key = key.key;
        bean.name = key.name;
        bean.user_id = userID;
        bean.active = key.active;
        bean.expires = key.expires;

        // Use the database utility to store with guaranteed ID
        bean = await storeWithAutoFallback(bean, "api_key", [ "user_id", "name", "key" ]);

        log.debug("apikeys", `Stored API key with ID: ${bean.id}`);
        return bean;
    }
}

module.exports = APIKey;
