'use strict';

const communicationGateway = require('./CommunicationGateway');
const ICommunicationProvider = require('./ICommunicationProvider');
const SmtpEmailProvider = require('./providers/SmtpEmailProvider');
const TwilioSmsProvider = require('./providers/TwilioSmsProvider');
const WebPushProvider = require('./providers/WebPushProvider');
const AirGappedMockProvider = require('./providers/AirGappedMockProvider');

module.exports = {
    communicationGateway,
    ICommunicationProvider,
    SmtpEmailProvider,
    TwilioSmsProvider,
    WebPushProvider,
    AirGappedMockProvider
};
