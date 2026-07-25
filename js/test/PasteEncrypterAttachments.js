'use strict';
require('../common');

describe('PasteEncrypter attachment loading', function () {
    it('waits for selected files before encrypting and uploading', async function () {
        const clean = globalThis.cleanup('', {url: 'https://example.com/'});
        let finishReading,
            cipherMessage,
            uploadAttempted = false;
        const attachmentReady = new Promise(resolve => {
            finishReading = resolve;
        });

        PrivateBin.Controller.hideStatusMessages = function () {};
        PrivateBin.TopNav.hideAllButtons = function () {};
        PrivateBin.TopNav.collapseBar = function () {};
        PrivateBin.TopNav.getFileList = function () {
            return [{name: 'example.txt'}];
        };
        PrivateBin.TopNav.getPassword = function () { return ''; };
        PrivateBin.TopNav.getOpenDiscussion = function () { return false; };
        PrivateBin.TopNav.getBurnAfterReading = function () { return false; };
        PrivateBin.TopNav.getExpiration = function () { return '5min'; };
        PrivateBin.Alert.showLoading = function () {};
        PrivateBin.Editor.getText = function () { return 'secret'; };
        PrivateBin.PasteViewer.getFormat = function () { return 'plaintext'; };
        PrivateBin.PasteViewer.setText = function () {};
        PrivateBin.PasteViewer.setFormat = function () {};
        PrivateBin.AttachmentViewer.getAttachmentDataPromise = function () {
            return attachmentReady;
        };
        PrivateBin.AttachmentViewer.getFiles = function () {
            return [{name: 'example.txt'}];
        };
        PrivateBin.AttachmentViewer.hasAttachmentData = function () { return true; };
        PrivateBin.AttachmentViewer.getAttachmentsData = function () {
            return ['data:text/plain;base64,c2VjcmV0'];
        };
        PrivateBin.AttachmentViewer.hasAttachment = function () { return false; };
        PrivateBin.ServerInteraction.prepare = function () {};
        PrivateBin.ServerInteraction.setCryptParameters = function () {};
        PrivateBin.ServerInteraction.setSuccess = function () {};
        PrivateBin.ServerInteraction.setFailure = function () {};
        PrivateBin.ServerInteraction.setUnencryptedData = function () {};
        PrivateBin.ServerInteraction.setCipherMessage = async function (message) {
            cipherMessage = message;
        };
        PrivateBin.ServerInteraction.run = function () {
            uploadAttempted = true;
        };

        const sending = PrivateBin.PasteEncrypter.sendPaste();
        await Promise.resolve();

        assert.strictEqual(uploadAttempted, false);
        assert.strictEqual(cipherMessage, undefined);

        finishReading();
        await sending;

        assert.strictEqual(uploadAttempted, true);
        assert.deepStrictEqual(
            cipherMessage.attachment,
            ['data:text/plain;base64,c2VjcmV0']
        );
        clean();
    });

    it('restores the editor when reading an attachment fails', async function () {
        const clean = globalThis.cleanup('', {url: 'https://example.com/'});
        let loadingHidden = false,
            createButtonsShown = false,
            shownError,
            uploadAttempted = false;
        PrivateBin.Controller.hideStatusMessages = function () {};
        PrivateBin.TopNav.hideAllButtons = function () {};
        PrivateBin.TopNav.collapseBar = function () {};
        PrivateBin.TopNav.showCreateButtons = function () {
            createButtonsShown = true;
        };
        PrivateBin.Alert.showLoading = function () {};
        PrivateBin.Alert.hideLoading = function () { loadingHidden = true; };
        PrivateBin.Alert.showError = function (error) { shownError = error; };
        PrivateBin.AttachmentViewer.getAttachmentDataPromise = function () {
            return Promise.reject(new Error('read failed'));
        };
        PrivateBin.ServerInteraction.run = function () {
            uploadAttempted = true;
        };

        await PrivateBin.PasteEncrypter.sendPaste();

        assert.strictEqual(uploadAttempted, false);
        assert.strictEqual(loadingHidden, true);
        assert.strictEqual(createButtonsShown, true);
        assert.strictEqual(shownError, 'Cannot read attachment.');
        clean();
    });
});
