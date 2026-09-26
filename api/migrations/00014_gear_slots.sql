-- +goose Up
-- Body kit plus notebook. Clothes that were "vestuario" sit on the torso;
-- laptops that were "setup" sit in the notebook slot.
UPDATE player_equipment SET slot = 'notebook' WHERE slot = 'setup';
UPDATE player_equipment SET slot = 'torso' WHERE slot = 'vestuario';

-- +goose Down
UPDATE player_equipment SET slot = 'setup' WHERE slot = 'notebook';
UPDATE player_equipment SET slot = 'vestuario' WHERE slot = 'torso';
