'use strict';
const common = require('../common');

describe('CryptTool error handling', function () {
    it('rejects when decrypted data cannot be decompressed', async function () {
        const originalZlib = global.zlib;
        global.zlib = Promise.resolve({
            deflate: function (data) {
                return {buffer: data.buffer};
            },
            inflate: function () {
                throw new Error('decompression failed');
            }
        });
        const clean = globalThis.cleanup();
        document.body.dataset.compression = 'zlib';
        PrivateBin.Controller.initZlib();
        Object.defineProperty(window, 'crypto', {
            value: new WebCrypto(),
            configurable: true
        });
        global.atob = common.atob;
        global.btoa = common.btoa;
        PrivateBin.Alert.showError = function () {};

        try {
            const cipherMessage = await PrivateBin.CryptTool.cipher(
                'key', 'password', 'secret', []
            );
            await assert.rejects(
                PrivateBin.CryptTool.decipher(
                    'key', 'password', cipherMessage
                ),
                /decompression failed/
            );
        } finally {
            global.zlib = originalZlib;
            clean();
        }
    });

    it('clears the loading state when paste decryption rejects', async function () {
        const clean = globalThis.cleanup('', {
            url: 'https://example.com/?0123456789abcdef#key'
        });
        let loadingHidden = false,
            shownError;
        PrivateBin.Alert.hideMessages = function () {};
        PrivateBin.Alert.setCustomHandler = function () {};
        PrivateBin.Alert.showLoading = function () {};
        PrivateBin.Alert.hideLoading = function () { loadingHidden = true; };
        PrivateBin.Alert.showError = function (error) { shownError = error; };
        PrivateBin.Model.getPasteKey = function () { return 'key'; };
        PrivateBin.Prompt.getPassword = function () { return ''; };
        PrivateBin.TopNav.setRetryCallback = function () {};
        PrivateBin.AttachmentViewer.removeAttachment = function () {};
        PrivateBin.PasteStatus.showRemainingTime = function () {};
        PrivateBin.CopyToClipboard.showKeyboardShortcutHint = function () {};
        const malformedPaste = {
            getCipherData: function () { return {}; },
            isDiscussionEnabled: function () { return false; }
        };

        PrivateBin.PasteDecrypter.run(malformedPaste);
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.strictEqual(loadingHidden, true);
        assert.strictEqual(shownError, 'unsupported message format');
        clean();
    });
});
