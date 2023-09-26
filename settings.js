const form = document.getElementById('settings-form');
const saveButton = document.getElementById('save-button');
const timeInputs = ['time2', 'time3', 'time4'].map(id => document.getElementById(id));
const timeSlider = document.getElementById('time-slider');
const ipInput = document.getElementById('ip');

const integerFormatter = {
    to: function(value) {
        return Math.round(value);
    },
    from: function(value) {
        return value;
    }
};

noUiSlider.create(timeSlider, {
    start: [51, 151, 351],
    connect: [true, true, true, true], 
    tooltips: [integerFormatter, integerFormatter, integerFormatter],
    step: 1,
    range: {
        'min': 0,
        'max': 500
    }
});

timeSlider.noUiSlider.on('update', (values) => {
    values.forEach((value, index) => {
        timeInputs[index].value = Math.round(value);
    });
    saveButton.disabled = false;
});

timeInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        const sliderValues = timeSlider.noUiSlider.get();
        sliderValues[index] = input.value;
        timeSlider.noUiSlider.set(sliderValues);
        saveButton.disabled = false;
    });
});

form.addEventListener('submit', event => {
    event.preventDefault();

    const settings = {
        time2: parseFloat(timeInputs[0].value),
        time3: parseFloat(timeInputs[1].value),
        time4: parseFloat(timeInputs[2].value),
        ip: ipInput.value,
    };

    console.log('Sending save-settings event with', settings);
    window.electron.send('save-settings', settings);
});

window.electron.on('load-settings', (settings) => {
    console.log('Received settings:', settings);
    timeSlider.noUiSlider.set([settings.time2, settings.time3, settings.time4]);
    loadSettingsToUI(settings);
});

window.electron.on('settings-saved', () => {
    saveButton.disabled = true;
});

document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('time-slider');

    noUiSlider.create(slider, {
        start: [51, 151, 351],
        connect: [true, true, true, true], 
        range: {
            'min': 0,
            'max': 1000
        }
    });

    slider.noUiSlider.on('update', (values) => {
        timeInputs[0].value = Math.round(values[0]);
        timeInputs[1].value = Math.round(values[1]);
        timeInputs[2].value = Math.round(values[2]);
        saveButton.disabled = false;
    });

    const savedSettings = window.electron.send('request-settings');
    ipInput.value = savedSettings.ip || '8.8.8.8';
    
    window.electron.send('request-settings');
});

function loadSettingsToUI(settings) {
    timeInputs[0].value = settings.time2 || '';
    timeInputs[1].value = settings.time3 || '';
    timeInputs[2].value = settings.time4 || '';
    ipInput.value = settings.ip || '8.8.8.8';
}
