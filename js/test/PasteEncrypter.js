'use strict';
const common = require('../common');

describe('PasteEncrypter', function () {
    function noop() {}

    function rejectEncryptionAndTrackUpload() {
        let uploadAttempted = false;
        global.btoa = common.btoa;
        global.atob = common.atob;
        document.body.dataset.compression = 'none';
        Object.defineProperty(window, 'crypto', {
            value: {
                getRandomValues: function (bytes) {
                    return bytes.fill(1);
                },
                subtle: {
                    importKey: function () {
                        return Promise.reject(new Error('encryption failed'));
                    },
                    deriveKey: function () {
                        return Promise.reject(new Error('deriveKey must not run'));
                    },
                    encrypt: function () {
                        return Promise.reject(new Error('encrypt must not run'));
                    }
                }
            },
            configurable: true
        });
        PrivateBin.ServerInteraction.run = function () {
            uploadAttempted = true;
        };
        PrivateBin.Alert.showError = noop;
        return function () {
            return uploadAttempted;
        };
    }

    it('does not upload a document when encryption fails', async function () {
        const clean = globalThis.cleanup('', {url: 'https://example.com/'});
        PrivateBin.Controller.hideStatusMessages = noop;
        PrivateBin.TopNav.hideAllButtons = noop;
        PrivateBin.TopNav.collapseBar = noop;
        let loadingHidden = false,
            createButtonsShown = false;
        PrivateBin.TopNav.showCreateButtons = function () { createButtonsShown = true; };
        PrivateBin.TopNav.getFileList = function () { return null; };
        PrivateBin.TopNav.getPassword = function () { return ''; };
        PrivateBin.TopNav.getOpenDiscussion = function () { return false; };
        PrivateBin.TopNav.getBurnAfterReading = function () { return false; };
        PrivateBin.TopNav.getExpiration = function () { return '5min'; };
        PrivateBin.Alert.showLoading = noop;
        PrivateBin.Alert.hideLoading = function () { loadingHidden = true; };
        PrivateBin.Editor.getText = function () { return 'secret'; };
        PrivateBin.PasteViewer.getFormat = function () { return 'plaintext'; };
        PrivateBin.PasteViewer.setText = noop;
        PrivateBin.PasteViewer.setFormat = noop;
        PrivateBin.AttachmentViewer.getFiles = function () { return null; };
        PrivateBin.AttachmentViewer.hasAttachmentData = function () { return false; };
        PrivateBin.AttachmentViewer.getAttachmentsData = function () { return []; };
        PrivateBin.AttachmentViewer.hasAttachment = function () { return false; };
        const wasUploadAttempted = rejectEncryptionAndTrackUpload();

        await PrivateBin.PasteEncrypter.sendPaste();

        assert.strictEqual(wasUploadAttempted(), false);
        assert.strictEqual(loadingHidden, true);
        assert.strictEqual(createButtonsShown, true);
        clean();
    });

    it('does not upload a comment when encryption fails', async function () {
        const clean = globalThis.cleanup('', {
            url: 'https://example.com/?0123456789abcdef#key'
        });
        PrivateBin.DiscussionViewer.getReplyMessage = function () { return 'secret'; };
        PrivateBin.DiscussionViewer.getReplyNickname = function () { return ''; };
        PrivateBin.DiscussionViewer.getReplyCommentId = function () { return undefined; };
        PrivateBin.DiscussionViewer.handleNotification = noop;
        PrivateBin.Alert.hideMessages = noop;
        const customHandlers = [];
        PrivateBin.Alert.setCustomHandler = function (handler) {
            customHandlers.push(handler);
        };
        PrivateBin.Alert.showLoading = noop;
        let loadingHidden = false,
            viewButtonsShown = false;
        PrivateBin.Alert.hideLoading = function () { loadingHidden = true; };
        PrivateBin.TopNav.hideAllButtons = noop;
        PrivateBin.TopNav.showViewButtons = function () { viewButtonsShown = true; };
        PrivateBin.Prompt.getPassword = function () { return ''; };
        PrivateBin.Model.getPasteKey = function () { return 'key'; };
        PrivateBin.Model.getPasteId = function () { return '0123456789abcdef'; };
        const wasUploadAttempted = rejectEncryptionAndTrackUpload();

        await PrivateBin.PasteEncrypter.sendComment();

        assert.strictEqual(wasUploadAttempted(), false);
        assert.strictEqual(loadingHidden, true);
        assert.strictEqual(viewButtonsShown, true);
        assert.strictEqual(customHandlers.at(-1), null);
        clean();
    });
});
